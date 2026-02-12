import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { RESTAURANTS } from "@shared/types";
import {
  getKSTISOTimestamp,
  getPastDatesByDayOfWeek
} from "./utils/date";

const AWS_REGION = process.env.AWS_REGION || "ap-northeast-2";
const DDB_TABLE_WAITING = process.env.DDB_TABLE_WAITING || "";
const WAITING_SOURCE = process.env.WAITING_SOURCE || "disabled";

const TTL_DAYS = 90;

let ddbDocClient: DynamoDBDocumentClient | null = null;

// [DEBUG] Check Environment Variables
console.log("[DEBUG] Env Check:", {
  DDB_TABLE_WAITING_ENV: process.env.DDB_TABLE_WAITING,
  Result: DDB_TABLE_WAITING || "UNDEFINED (will be disabled)"
});

function getDdbClient(): DynamoDBDocumentClient {
  if (!ddbDocClient) {
    const ddbClient = new DynamoDBClient({ region: AWS_REGION });
    ddbDocClient = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return ddbDocClient;
}

export function isDdbWaitingEnabled(): boolean {
  if (WAITING_SOURCE === "ddb") {
    if (!DDB_TABLE_WAITING) {
      console.error("[DDB] WAITING_SOURCE is 'ddb' but DDB_TABLE_WAITING is not set. Disabling DDB.");
      return false;
    }
    return true;
  }
  return false;
}

function buildPk(restaurantId: string, cornerId: string): string {
  return `CORNER#${restaurantId}#${cornerId}`;
}

// Helper to convert ISO string to Epoch Millis
function isoToEpochMillis(isoString: string): number {
  return new Date(isoString).getTime();
}

// Convert Epoch Millis to KST ISO string (+09:00)
function epochMillisToKSTISO(epochMs: number): string {
  const date = new Date(epochMs);
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return formatter.format(date).replace(" ", "T") + "+09:00";
}

function getKSTDayBoundaries(dateKey: string): { startMs: number; endMs: number } {
  // dateKey is YYYY-MM-DD
  const startKST = new Date(`${dateKey}T00:00:00+09:00`);
  const endKST = new Date(`${dateKey}T23:59:59.999+09:00`);
  return {
    startMs: startKST.getTime(),
    endMs: endKST.getTime(),
  };
}

export interface DdbWaitingSnapshot {
  restaurantId: string;
  cornerId: string;
  queueLen: number;
  timestampIso?: string;
  timestampEpochMillis?: number;
  dataType?: string;
  source?: string;
}

export interface DdbPutResult {
  success: boolean;
  inserted: number;
  errors: string[];
}

export async function putWaitingSnapshots(snapshots: DdbWaitingSnapshot[]): Promise<DdbPutResult> {
  if (!isDdbWaitingEnabled()) {
    return { success: false, inserted: 0, errors: ["DynamoDB waiting source is disabled"] };
  }

  if (snapshots.length === 0) {
    return { success: true, inserted: 0, errors: [] };
  }

  const client = getDdbClient();
  const nowEpochSeconds = Math.floor(Date.now() / 1000);
  const ttl = nowEpochSeconds + TTL_DAYS * 24 * 60 * 60;

  // Use centralized util
  const createdAtIso = getKSTISOTimestamp();

  const errors: string[] = [];
  let inserted = 0;

  const writeRequests: Array<{ PutRequest: { Item: Record<string, unknown> } }> = [];

  for (const snapshot of snapshots) {
    let skNum: number;
    let timestampIso: string;

    if (snapshot.timestampEpochMillis) {
      skNum = snapshot.timestampEpochMillis;
      timestampIso = snapshot.timestampIso || epochMillisToKSTISO(skNum);
    } else if (snapshot.timestampIso) {
      skNum = isoToEpochMillis(snapshot.timestampIso);
      timestampIso = snapshot.timestampIso;
    } else {
      errors.push(`Missing timestamp for ${snapshot.restaurantId}/${snapshot.cornerId}`);
      continue;
    }

    const pk = buildPk(snapshot.restaurantId, snapshot.cornerId);
    const sk = String(skNum);

    const item = {
      pk,
      sk,
      restaurantId: snapshot.restaurantId,
      cornerId: snapshot.cornerId,
      queueLen: snapshot.queueLen,
      dataType: snapshot.dataType || "observed",
      source: snapshot.source,
      timestampIso,
      createdAtIso,
      ttl,
    };

    writeRequests.push({ PutRequest: { Item: item } });
  }

  if (writeRequests.length === 0) {
    return { success: errors.length === 0, inserted: 0, errors };
  }

  if (writeRequests.length <= 25) {
    try {
      await client.send(
        new BatchWriteCommand({
          RequestItems: {
            [DDB_TABLE_WAITING]: writeRequests,
          },
        })
      );
      inserted = writeRequests.length;
    } catch (error) {
      const errMsg = (error as Error).message || "Unknown error";
      console.error(`[DDB] BatchWrite failed: ${errMsg}`);
      errors.push(`BatchWrite failed: ${errMsg}`);
    }
  } else {
    for (let i = 0; i < writeRequests.length; i += 25) {
      const batch = writeRequests.slice(i, i + 25);
      try {
        await client.send(
          new BatchWriteCommand({
            RequestItems: {
              [DDB_TABLE_WAITING]: batch,
            },
          })
        );
        inserted += batch.length;
      } catch (error) {
        const errMsg = (error as Error).message || "Unknown error";
        console.error(`[DDB] BatchWrite batch ${i / 25} failed: ${errMsg}`);
        errors.push(`BatchWrite batch ${i / 25} failed: ${errMsg}`);
      }
    }
  }

  const success = errors.length === 0;
  console.log(`[DDB] putSnapshots: inserted=${inserted} errors=${errors.length}`);
  return { success, inserted, errors };
}

export interface DdbLatestResult {
  rows: Array<{
    timestamp: Date;
    restaurantId: string;
    cornerId: string;
    queueLen: number;
    dataType: string | null;
    source: string | null;
  }>;
  latestTimestamp: string | null;
}

export async function getLatestByDate(dateKey: string): Promise<DdbLatestResult> {
  if (!isDdbWaitingEnabled()) {
    throw new Error("DynamoDB waiting source is disabled");
  }

  const client = getDdbClient();
  const { startMs, endMs } = getKSTDayBoundaries(dateKey);

  const allCorners: Array<{ restaurantId: string; cornerId: string }> = [];
  for (const restaurant of RESTAURANTS) {
    for (const cornerId of restaurant.cornerOrder) {
      allCorners.push({ restaurantId: restaurant.id, cornerId });
    }
  }

  const latestItems: Array<{
    pk: string;
    sk: string;
    restaurantId: string;
    cornerId: string;
    queueLen: number;
    dataType?: string;
    source?: string;
    timestampIso?: string;
  }> = [];

  const queryPromises = allCorners.map(async ({ restaurantId, cornerId }) => {
    const pk = buildPk(restaurantId, cornerId);
    try {
      const result = await client.send(
        new QueryCommand({
          TableName: DDB_TABLE_WAITING,
          KeyConditionExpression: "pk = :pk AND sk BETWEEN :start AND :end",
          ExpressionAttributeValues: {
            ":pk": pk,
            ":start": String(startMs),
            ":end": String(endMs),
          },
          ScanIndexForward: false,
          Limit: 1,
        })
      );
      if (result.Items && result.Items.length > 0) {
        return result.Items[0];
      }
    } catch (error) {
      console.error(`[DDB] Query failed for ${pk}:`, (error as Error).message);
    }
    return null;
  });

  const results = await Promise.all(queryPromises);
  for (const item of results) {
    if (item) {
      latestItems.push(item as typeof latestItems[0]);
    }
  }

  if (latestItems.length === 0) {
    return { rows: [], latestTimestamp: null };
  }

  const maxSk = Math.max(...latestItems.map((item) => Number(item.sk)));

  const rows = latestItems
    .filter((item) => Number(item.sk) === maxSk)
    .map((item) => ({
      timestamp: new Date(Number(item.sk)),
      restaurantId: item.restaurantId,
      cornerId: item.cornerId,
      queueLen: item.queueLen,
      dataType: item.dataType || null,
      source: item.source || null,
    }));

  const latestTimestamp = epochMillisToKSTISO(maxSk);

  return { rows, latestTimestamp };
}

export interface DdbAllDataRow {
  timestamp: string;
  restaurantId: string;
  cornerId: string;
  queue_len: number;
  est_wait_time_min: number;
  data_type: string;
}

export async function getAllDataByDate(
  dateKey: string,
  computeWaitFn: (queueLen: number, restaurantId: string, cornerId: string) => number
): Promise<DdbAllDataRow[]> {
  if (!isDdbWaitingEnabled()) {
    throw new Error("DynamoDB waiting source is disabled");
  }

  const client = getDdbClient();
  const { startMs, endMs } = getKSTDayBoundaries(dateKey);

  const allCorners: Array<{ restaurantId: string; cornerId: string }> = [];
  for (const restaurant of RESTAURANTS) {
    for (const cornerId of restaurant.cornerOrder) {
      allCorners.push({ restaurantId: restaurant.id, cornerId });
    }
  }

  const allItems: DdbAllDataRow[] = [];

  const queryPromises = allCorners.map(async ({ restaurantId, cornerId }) => {
    const pk = buildPk(restaurantId, cornerId);
    try {
      const result = await client.send(
        new QueryCommand({
          TableName: DDB_TABLE_WAITING,
          KeyConditionExpression: "pk = :pk AND sk BETWEEN :start AND :end",
          ExpressionAttributeValues: {
            ":pk": pk,
            ":start": String(startMs),
            ":end": String(endMs),
          },
          ScanIndexForward: true,
        })
      );
      return (result.Items || []).map((item: Record<string, unknown>) => ({
        timestamp: epochMillisToKSTISO(Number(item.sk)),
        restaurantId: item.restaurantId as string,
        cornerId: item.cornerId as string,
        queue_len: item.queueLen as number,
        est_wait_time_min: computeWaitFn(
          item.queueLen as number,
          item.restaurantId as string,
          item.cornerId as string
        ),
        data_type: (item.dataType as string) || "observed",
      }));
    } catch (error) {
      console.error(`[DDB] Query failed for ${pk}:`, (error as Error).message);
      return [];
    }
  });

  const results = await Promise.all(queryPromises);
  for (const items of results) {
    allItems.push(...items);
  }

  allItems.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return allItems;
}

export async function getTimestampsByDate(dateKey: string): Promise<string[]> {
  if (!isDdbWaitingEnabled()) {
    throw new Error("DynamoDB waiting source is disabled");
  }

  const client = getDdbClient();
  const { startMs, endMs } = getKSTDayBoundaries(dateKey);

  const allCorners: Array<{ restaurantId: string; cornerId: string }> = [];
  for (const restaurant of RESTAURANTS) {
    for (const cornerId of restaurant.cornerOrder) {
      allCorners.push({ restaurantId: restaurant.id, cornerId });
    }
  }

  const allSks = new Set<number>();

  const queryPromises = allCorners.map(async ({ restaurantId, cornerId }) => {
    const pk = buildPk(restaurantId, cornerId);
    try {
      const result = await client.send(
        new QueryCommand({
          TableName: DDB_TABLE_WAITING,
          KeyConditionExpression: "pk = :pk AND sk BETWEEN :start AND :end",
          ExpressionAttributeValues: {
            ":pk": pk,
            ":start": String(startMs),
            ":end": String(endMs),
          },
          ProjectionExpression: "sk",
          ScanIndexForward: true,
        })
      );
      return (result.Items || []).map((item: Record<string, unknown>) => Number(item.sk));
    } catch (error) {
      console.error(`[DDB] Query failed for ${pk}:`, (error as Error).message);
      return [];
    }
  });

  const results = await Promise.all(queryPromises);
  for (const sks of results) {
    for (const sk of sks) {
      allSks.add(sk);
    }
  }

  const sortedSks = Array.from(allSks).sort((a, b) => a - b);
  return sortedSks.map((sk) => epochMillisToKSTISO(sk));
}

export async function checkDdbConnection(): Promise<boolean> {
  if (!isDdbWaitingEnabled()) {
    return false;
  }
  try {
    const client = getDdbClient();
    await client.send(
      new QueryCommand({
        TableName: DDB_TABLE_WAITING,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": "HEALTH_CHECK",
        },
        Limit: 1,
      })
    );
    return true;
  } catch (error) {
    console.error("[DDB] Connection check failed:", (error as Error).message);
    return false;
  }
}

// ============================================================================
// Prediction Logic (Migrated from Storage.ts)
// ============================================================================

export interface PredictionRow {
  restaurantId: string;
  cornerId: string;
  avgQueueLen: number;
  waitMin: number;
}

export interface PredictionResult {
  predictions: PredictionRow[];
  basedOnDays: number;
  sampleSize: number;
}

/**
 * Get prediction data by day-of-week and time bucket.
 * Uses historical averages from same day-of-week and same 5-min time bucket.
 * Fetches past 4 weeks of data from DynamoDB and aggregates in-memory.
 */
export async function getPredictionByDayAndTime(
  dayOfWeek: number,
  timeHHMM: string,
  computeWaitFn: (queueLen: number, restaurantId: string, cornerId: string) => number
): Promise<PredictionResult> {
  if (!isDdbWaitingEnabled()) {
    throw new Error("DynamoDB waiting source is disabled");
  }

  const client = getDdbClient();
  const pastDates = getPastDatesByDayOfWeek(dayOfWeek, 4); // Check last 4 weeks

  const [hours, minutes] = timeHHMM.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    return { predictions: [], basedOnDays: 0, sampleSize: 0 };
  }

  // Define 5-minute bucket window
  const bucketStart = Math.floor(minutes / 5) * 5;
  const startMinutes = hours * 60 + bucketStart;
  const endMinutes = startMinutes + 4; // 5 minute window (inclusive)

  const allCorners: Array<{ restaurantId: string; cornerId: string }> = [];
  for (const restaurant of RESTAURANTS) {
    for (const cornerId of restaurant.cornerOrder) {
      allCorners.push({ restaurantId: restaurant.id, cornerId });
    }
  }

  // Aggregation map: key = "restId#cornerId", value = list of queueLens
  const aggregation = new Map<string, number[]>();
  // We need to track how many UNIQUE days actually contributed data
  const daysWithData = new Set<string>();
  let totalSampleCount = 0;

  // Parallel execution of all corner-date queries
  const queryPromises = [];

  for (const dateKey of pastDates) {
    // Construct start/end millis for this date's bucket
    const dateStartObj = new Date(`${dateKey}T00:00:00+09:00`);
    const dateStartMs = dateStartObj.getTime();

    // Safety check for date validity
    if (isNaN(dateStartMs)) continue;

    const bucketStartMs = dateStartMs + (startMinutes * 60 * 1000);
    // End of the bucket window (e.g. 12:00 -> 12:04:59.999)
    const bucketEndMs = dateStartMs + (endMinutes * 60 * 1000) + 59999;

    for (const { restaurantId, cornerId } of allCorners) {
      const pk = buildPk(restaurantId, cornerId);

      const p = client.send(
        new QueryCommand({
          TableName: DDB_TABLE_WAITING,
          KeyConditionExpression: "pk = :pk AND sk BETWEEN :start AND :end",
          ExpressionAttributeValues: {
            ":pk": pk,
            ":start": String(bucketStartMs),
            ":end": String(bucketEndMs),
          },
        })
      ).then(result => {
        if (result.Items && result.Items.length > 0) {
          // Found data for this corner on this day/time
          const items = result.Items;

          // Calculate average for this specific bucket instance
          const sum = items.reduce((acc: number, item: any) => acc + (Number(item.queueLen) || 0), 0);
          const avg = sum / items.length;

          const key = `${restaurantId}#${cornerId}`;
          if (!aggregation.has(key)) {
            aggregation.set(key, []);
          }
          aggregation.get(key)!.push(avg);

          daysWithData.add(dateKey);
          totalSampleCount += items.length;
        }
      }).catch(err => {
        console.error(`[DDB] Prediction Query Error ${pk} on ${dateKey}`, err);
      });

      queryPromises.push(p);
    }
  }

  // Wait for all queries to complete
  await Promise.all(queryPromises);

  const predictions: PredictionRow[] = [];

  for (const [key, values] of aggregation.entries()) {
    const [restaurantId, cornerId] = key.split('#');

    // Average of averages (mean of means)
    const totalAvg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const roundedAvg = Math.round(totalAvg);

    predictions.push({
      restaurantId,
      cornerId,
      avgQueueLen: roundedAvg,
      waitMin: computeWaitFn(roundedAvg, restaurantId, cornerId),
    });
  }

  return {
    predictions,
    basedOnDays: daysWithData.size,
    sampleSize: totalSampleCount,
  };
}
