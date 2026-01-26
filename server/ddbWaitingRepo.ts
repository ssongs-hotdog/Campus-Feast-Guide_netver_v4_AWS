import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { RESTAURANTS } from "@shared/types";

const AWS_REGION = process.env.AWS_REGION || "ap-northeast-2";
const DDB_TABLE_WAITING = process.env.DDB_TABLE_WAITING || "hyeat_YOLO_data";
const WAITING_SOURCE = process.env.WAITING_SOURCE || "postgres";

const TTL_DAYS = 90;

let ddbDocClient: DynamoDBDocumentClient | null = null;

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
  return WAITING_SOURCE === "ddb";
}

function buildPk(restaurantId: string, cornerId: string): string {
  return `CORNER#${restaurantId}#${cornerId}`;
}

function getKSTISOTimestamp(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}+09:00`;
}

function isoToEpochMillis(isoString: string): number {
  return new Date(isoString).getTime();
}

function getKSTDayBoundaries(dateKey: string): { startMs: number; endMs: number } {
  const startKST = new Date(`${dateKey}T00:00:00+09:00`);
  const endKST = new Date(`${dateKey}T23:59:59.999+09:00`);
  return {
    startMs: startKST.getTime(),
    endMs: endKST.getTime(),
  };
}

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
