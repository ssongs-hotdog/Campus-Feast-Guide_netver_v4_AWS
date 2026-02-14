/**
 * routes.ts - API Route Definitions
 * 
 * 🧪 Git Workflow Practice - Test comment by 송준의 (2026-02-12)
 * 
 * Purpose: Defines all REST API endpoints for the HY-eat application.
 * This is the server-side data access layer that serves:
 * - Menu data (from S3 only)
 * - Waiting/queue data (from DynamoDB only)
 * - Timestamp listings for data navigation
 * 
 * SSOT Policy:
 * - External stores (S3/DynamoDB) are the SINGLE SOURCE OF TRUTH.
 * - NO local file system reads for data.
 * - NO memory caching of local data.
 * - If AWS services are unavailable/disabled, return 503/404 errors.
 */
import type { Express, Request, Response } from "express";

import { getMenuFromS3, isS3MenuEnabled, getMenuCacheStats } from "./s3MenuService";
import {
  getKSTDateKey,
  getKSTISOTimestamp,
  getTomorrowKSTDateKey,
  getDayOfWeekKST,
  getDayOfWeekNameKo
} from "./utils/date";
import {
  isDdbWaitingEnabled,
  getLatestByDate as ddbGetLatestByDate,
  getAllDataByDate as ddbGetAllDataByDate,
  getTimestampsByDate as ddbGetTimestampsByDate,
  checkDdbConnection,
  getPredictionByDayAndTime
} from "./ddbWaitingRepo";
import {
  isS3WaitingEnabled,
  getWaitingDataFromS3,
  getS3WaitingCacheStats
} from "./s3WaitingService";
// import { computeWaitMinutes } from "./waitModel"; // ❌ REMOVED: Now using DynamoDB estWaitTimeMin
import { validate, DateParamSchema, DateTimeQuerySchema } from "./utils/validation"; // [New] Import Validation
import { log, logError } from "./utils/logger"; // [New] Import Logger
import { RESTAURANTS } from "@shared/types"; // [New] Import for time-range query optimization

// Stale threshold for waiting data
const WAITING_STALE_SECONDS = (() => {
  const val = parseInt(process.env.WAITING_STALE_SECONDS || '90', 10);
  return isNaN(val) ? 90 : val;
})();

function getTodayDateKey(): string {
  return getKSTDateKey();
}

/**
 * Register all API routes
 */
export async function registerRoutes(
  app: Express
): Promise<void> {

  // Postgres index creation removed (Legacy)

  app.get('/api/dates', (_req: Request, res: Response) => {
    // We only provide today's date shortcut. 
    // Available dates should be queried via S3/DB in a real scenario, 
    // but for now the frontend handles navigation logic primarily.
    // If needed, we could scan S3/DB for all available dates.
    res.json({ dates: [], today: getTodayDateKey() });
  });

  // [New] Applied validation middleware
  app.get('/api/menu', validate(DateParamSchema), async (req: Request, res: Response) => {
    const dateParam = req.query.date as string | undefined;
    const targetDate = dateParam || getTodayDateKey();

    // Manual check removed - Zod handled it

    // Strict S3-only logic
    if (isS3MenuEnabled()) {
      const s3Result = await getMenuFromS3(targetDate);

      if (s3Result.success && s3Result.data) {
        return res.json(s3Result.data);
      }

      return res.status(404).json({
        error: 'MENU_DATA_NOT_AVAILABLE',
        message: s3Result.error || 'Menu data not found in S3',
        date: targetDate,
        source: 's3',
      });
    }

    return res.status(503).json({
      error: 'MENU_SERVICE_DISABLED',
      message: 'Menu data source is not configured (MENU_SOURCE != s3).',
      date: targetDate,
    });
  });

  // [New] Applied validation middleware
  app.get('/api/waiting/timestamps', validate(DateParamSchema), async (req: Request, res: Response) => {
    const dateParam = req.query.date as string | undefined;
    const targetDate = dateParam || getTodayDateKey();
    const isToday = targetDate === getTodayDateKey();

    try {
      if (isToday) {
        if (isDdbWaitingEnabled()) {
          log(`[API] Fetching timestamps for date: ${targetDate} (DDB)`);
          const timestamps = await ddbGetTimestampsByDate(targetDate);
          log(`[API] Successfully fetched ${timestamps.length} timestamps`);
          return res.json({ timestamps });
        }
      } else {
        if (isS3WaitingEnabled()) {
          log(`[API] Fetching timestamps for date: ${targetDate} (S3)`);
          const s3Result = await getWaitingDataFromS3(targetDate);

          if (s3Result.success && s3Result.data) {
            const uniqueTimestamps = Array.from(new Set(s3Result.data.map(item => item.timestamp))).sort();
            log(`[API] Successfully fetched ${uniqueTimestamps.length} timestamps from S3`);
            return res.json({ timestamps: uniqueTimestamps });
          }
          if (s3Result.error === "S3 object not found") {
            return res.json({ timestamps: [] });
          }
        }
      }

      return res.status(503).json({ error: 'Waiting data source is unavailable or disabled' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : 'No stack trace';
      logError(`[API] timestamps query failed for date ${targetDate}:`, error);
      console.error('[API] Full error details:', { errorMessage, errorStack, targetDate });
      return res.status(503).json({ error: 'Database unavailable', details: errorMessage });
    }
  });

  // [New] Applied validation middleware for both date and time
  app.get('/api/waiting', validate(DateTimeQuerySchema), async (req: Request, res: Response) => {
    const dateParam = req.query.date as string | undefined;
    const timeParam = req.query.time as string | undefined;

    const targetDate = dateParam || getTodayDateKey();
    const isToday = targetDate === getTodayDateKey();

    try {
      // 1. TODAY -> DynamoDB Logic
      if (isToday && isDdbWaitingEnabled()) {
        let filtered;

        if (timeParam) {
          if (timeParam.includes('T') || timeParam.includes('+')) {
            // ISO timestamp match - query all then filter (rare case)
            const allData = await ddbGetAllDataByDate(targetDate);
            filtered = allData.filter(row => row.timestamp === timeParam);
          } else {
            // HH:MM format - calculate 5-minute time range and query DynamoDB directly
            const [hours, minutes] = timeParam.split(':').map(Number);
            const bucketStart = Math.floor(minutes / 5) * 5;

            // Build KST time range for this 5-minute bucket
            const startHHMM = `${String(hours).padStart(2, '0')}:${String(bucketStart).padStart(2, '0')}`;
            const endMinutes = bucketStart + 4;
            const endHHMM = `${String(hours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

            // Convert to epoch milliseconds (KST)
            const dateStartKST = new Date(`${targetDate}T${startHHMM}:00+09:00`);
            const dateEndKST = new Date(`${targetDate}T${endHHMM}:59.999+09:00`);

            const startMs = dateStartKST.getTime();
            const endMs = dateEndKST.getTime();

            log(`[API] Querying DDB for time range: ${startHHMM} - ${endHHMM} (${startMs} - ${endMs})`);

            // Query only this specific time range from DynamoDB
            const allCorners: Array<{ restaurantId: string; cornerId: string }> = [];
            for (const restaurant of RESTAURANTS) {
              for (const cornerId of restaurant.cornerOrder) {
                allCorners.push({ restaurantId: restaurant.id, cornerId });
              }
            }

            // ✅ HOTFIX: Move imports and client creation outside loop for performance
            const { DynamoDBDocumentClient } = await import('@aws-sdk/lib-dynamodb');
            const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
            const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');

            // This is a workaround - ideally we'd import from ddbWaitingRepo
            // but it doesn't expose a time-range query function yet
            const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-northeast-2" });
            const docClient = DynamoDBDocumentClient.from(ddbClient, {
              marshallOptions: { removeUndefinedValues: true },
            });

            // ✅ HOTFIX: Convert sequential queries to parallel execution
            const queryPromises = allCorners.map(async ({ restaurantId, cornerId }) => {
              const pk = `CORNER#${restaurantId}#${cornerId}`;
              try {
                const result = await docClient.send(
                  new QueryCommand({
                    TableName: process.env.DDB_TABLE_WAITING || "",
                    KeyConditionExpression: "pk = :pk AND sk BETWEEN :start AND :end",
                    ExpressionAttributeValues: {
                      ":pk": pk,
                      ":start": String(startMs),
                      ":end": String(endMs),
                    },
                  })
                );

                if (result.Items && result.Items.length > 0) {
                  return result.Items.map((item: any) => {
                    const timestampMs = Number(item.sk);
                    const date = new Date(timestampMs);
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
                    const timestampIso = formatter.format(date).replace(" ", "T") + "+09:00";

                    return {
                      timestamp: timestampIso,
                      restaurantId: item.restaurantId,
                      cornerId: item.cornerId,
                      queue_len: item.queueLen,
                      est_wait_time_min: (item as any).estWaitTimeMin ?? 0,
                      data_type: (item.dataType as string) || "observed",
                    };
                  });
                }
                return [];
              } catch (error) {
                logError(`[API] Query failed for ${pk}:`, error);
                return [];
              }
            });

            // ✅ Use Promise.allSettled to handle partial failures gracefully
            const queryResults = await Promise.allSettled(queryPromises);

            const results: any[] = [];
            let failedQueries = 0;

            for (const settledResult of queryResults) {
              if (settledResult.status === 'fulfilled') {
                results.push(...settledResult.value);
              } else {
                failedQueries++;
              }
            }

            if (failedQueries > 0) {
              log(`[API] Warning: ${failedQueries} out of ${allCorners.length} queries failed`);
            }

            filtered = results;
            log(`[API] Time-range query returned ${filtered.length} items`);
          }
        } else {
          // No time param -> return latest in that day using optimized query
          const { rows, latestTimestamp } = await ddbGetLatestByDate(targetDate);

          if (rows.length === 0) {
            filtered = [];
          } else {
            // Convert from ddbGetLatestByDate format to expected format
            filtered = rows.map(row => ({
              timestamp: latestTimestamp!,
              restaurantId: row.restaurantId,
              cornerId: row.cornerId,
              queue_len: row.queueLen,
              est_wait_time_min: row.estWaitTimeMin ?? 0,
              data_type: row.dataType || 'observed',
            }));
          }
        }

        // Fix snake_case to camelCase mismatch for frontend (WaitingData interface)
        const mapped = filtered.map(row => {
          const qLen = (row as any).queueLen ?? (row as any).queue_len ?? 0;
          const waitMin = (row as any).estWaitTimeMin ?? (row as any).est_wait_time_min ?? 0;

          return {
            timestamp: row.timestamp,
            restaurantId: row.restaurantId,
            cornerId: row.cornerId,
            queueLen: Number(qLen),
            estWaitTimeMin: Number(waitMin),
            data_type: row.data_type,
          };
        });

        return res.json(mapped);
      } // End of TODAY + DDB

      // 2. PAST/FUTURE -> S3 Logic
      else if (!isToday && isS3WaitingEnabled()) {
        const s3Result = await getWaitingDataFromS3(targetDate);
        if (!s3Result.success || !s3Result.data) {
          if (s3Result.error === "S3 object not found") {
            return res.json([]);
          }
          throw new Error(s3Result.error || "S3 fetch failed");
        }

        let filtered = s3Result.data;

        if (timeParam) {
          if (timeParam.includes('T') || timeParam.includes('+')) {
            filtered = filtered.filter(item => item.timestamp === timeParam);
          } else {
            // HH:MM Filter
            filtered = filtered.filter(item => {
              const timePart = item.timestamp.split('T')[1];
              if (!timePart) return false;
              const hhmm = timePart.substring(0, 5);

              const [tHour, tMin] = hhmm.split(':').map(Number);
              const [pHour, pMin] = timeParam.split(':').map(Number);

              if (tHour !== pHour) return false;

              const bucketStart = Math.floor(pMin / 5) * 5;
              return tMin >= bucketStart && tMin < bucketStart + 5;
            });
          }
        } else {
          // No time param -> latest
          if (filtered.length > 0) {
            filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
            const latestTs = filtered[0].timestamp;
            filtered = filtered.filter(item => item.timestamp === latestTs);
          }
        }

        return res.json(filtered);
      }

      return res.status(503).json({ error: 'DynamoDB waiting source is disabled' });
    } catch (error) {
      logError('[API] waiting query failed:', error);
      return res.status(503).json({ error: 'Database unavailable' });
    }
  });

  // [New] Applied validation middleware
  app.get('/api/waiting/all', validate(DateParamSchema), async (req: Request, res: Response) => {
    const dateParam = req.query.date as string | undefined;
    const targetDate = dateParam || getTodayDateKey();
    const isToday = targetDate === getTodayDateKey();

    try {
      if (isToday) {
        if (isDdbWaitingEnabled()) {
          const data = await ddbGetAllDataByDate(targetDate);
          return res.json(data);
        }
      } else {
        if (isS3WaitingEnabled()) {
          const s3Result = await getWaitingDataFromS3(targetDate);
          if (s3Result.success && s3Result.data) {
            return res.json(s3Result.data);
          }
          if (s3Result.error === "S3 object not found") {
            return res.json([]);
          }
        }
      }
      return res.status(503).json({ error: 'DynamoDB waiting source is disabled' });
    } catch (error) {
      logError('[API] all-data query failed:', error);
      return res.status(503).json({ error: 'Database unavailable' });
    }
  });

  app.get('/api/config', (_req: Request, res: Response) => {
    res.json({
      useDbWaiting: isDdbWaitingEnabled(),
      today: getTodayDateKey(),
      tomorrow: getTomorrowKSTDateKey(),
      serverTime: getKSTISOTimestamp(),
    });
  });

  app.get('/api/predict', async (req: Request, res: Response) => {
    // Note: predict has specific time param logic (HH:MM only), so we can make a specific schema or just check manually for now.
    // Let's keep manual check for now or add a TimeOnly schema later.
    const timeParam = req.query.time as string | undefined;

    if (!timeParam || !/^\d{2}:\d{2}$/.test(timeParam)) {
      return res.status(400).json({ error: 'Invalid time format. Use HH:MM' });
    }

    const [hours, minutes] = timeParam.split(':').map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return res.status(400).json({ error: 'Invalid time format. Use HH:MM' });
    }

    const tomorrow = getTomorrowKSTDateKey();
    const dayOfWeek = getDayOfWeekKST(tomorrow);
    const dayOfWeekName = getDayOfWeekNameKo(dayOfWeek);

    const bucketStart = Math.floor(minutes / 5) * 5;
    const bucketStartStr = `${String(hours).padStart(2, '0')}:${String(bucketStart).padStart(2, '0')}`;
    const bucketEndStr = `${String(hours).padStart(2, '0')}:${String(bucketStart + 4).padStart(2, '0')}`;

    try {
      const result = await getPredictionByDayAndTime(dayOfWeek, timeParam);

      const confidence = result.basedOnDays >= 4 ? 'high'
        : result.basedOnDays >= 2 ? 'medium'
          : result.basedOnDays >= 1 ? 'low' : 'none';

      const predictions = result.predictions.map(p => ({
        restaurantId: p.restaurantId,
        cornerId: p.cornerId,
        predictedQueueLen: p.avgQueueLen,
        predictedWaitMin: p.waitMin,
      }));

      return res.json({
        predictions,
        metadata: {
          targetDate: tomorrow,
          targetTime: timeParam,
          timezone: 'Asia/Seoul',
          timezoneOffset: '+09:00',
          dayOfWeek,
          dayOfWeekName,
          timeBucket: `${bucketStartStr}-${bucketEndStr}`,
          basedOnDays: result.basedOnDays,
          sampleSize: result.sampleSize,
          confidence,
          generatedAt: getKSTISOTimestamp(),
        },
      });
    } catch (error) {
      logError('[API] Prediction query failed:', error);
      return res.status(503).json({ error: 'Database unavailable (Prediction)' });
    }
  });

  app.get('/api/health', async (_req: Request, res: Response) => {
    const now = getKSTISOTimestamp();
    const ddbStatus = isDdbWaitingEnabled() ? (await checkDdbConnection()) : false;
    const s3Enabled = isS3MenuEnabled();
    const menuCacheStats = getMenuCacheStats();

    // [New] S3 Waiting Stats
    const s3WaitingStats = getS3WaitingCacheStats();

    res.json({
      status: 'ok',
      timestamp: now,
      services: {
        dynamoDB: {
          enabled: isDdbWaitingEnabled(),
          connected: ddbStatus,
        },
        s3Menu: {
          enabled: s3Enabled,
          cache: menuCacheStats,
        },
        s3Waiting: {
          enabled: isS3WaitingEnabled(),
          cache: s3WaitingStats
        }
      }
    });
  });

  // Alias for AWS Lambda health check (matches API Gateway GET /health)
  app.get('/health', async (_req: Request, res: Response) => {
    const now = getKSTISOTimestamp();
    const ddbStatus = isDdbWaitingEnabled() ? (await checkDdbConnection()) : false;
    const s3Enabled = isS3MenuEnabled();
    const menuCacheStats = getMenuCacheStats();
    // [New] S3 Waiting Stats
    const s3WaitingStats = getS3WaitingCacheStats();

    res.json({
      status: 'ok',
      timestamp: now,
      services: {
        dynamoDB: {
          enabled: isDdbWaitingEnabled(),
          connected: ddbStatus,
        },
        s3Menu: {
          enabled: s3Enabled,
          cache: menuCacheStats,
        },
        s3Waiting: {
          enabled: isS3WaitingEnabled(),
          cache: s3WaitingStats
        }
      }
    });
  });

  // [New] Applied validation middleware
  app.get('/api/waiting/latest', validate(DateParamSchema), async (req: Request, res: Response) => {
    const startTime = Date.now();
    const dateParam = (req.query.date as string) || getTodayDateKey();
    const isToday = dateParam === getTodayDateKey();

    // 1. TODAY -> Use DDB
    if (isToday && isDdbWaitingEnabled()) {
      try {
        const { rows, latestTimestamp } = await ddbGetLatestByDate(dateParam);

        // 1. No data in DB for this date
        if (rows.length === 0) {
          log(`[Latest] DDB OK: date=${dateParam} ts=null rows=0 latencyMs=${Date.now() - startTime}`);
          return res.json([]);
        }

        const latestTime = new Date(latestTimestamp!).getTime();
        const nowTime = Date.now();
        const ageSec = Math.floor((nowTime - latestTime) / 1000);

        // 2. Data exists but is stale (older than threshold)
        if (ageSec > WAITING_STALE_SECONDS) {
          const latency = Date.now() - startTime;
          log(`[Latest] DDB STALE: date=${dateParam} latest=${latestTimestamp} ageSec=${ageSec} thresholdSec=${WAITING_STALE_SECONDS} latencyMs=${latency}`, {
            warn: true,
            ageSec
          });
          return res.json([]);
        }

        // 3. Valid recent data
        const result = rows.map(row => ({
          timestamp: latestTimestamp!,
          restaurantId: row.restaurantId,
          cornerId: row.cornerId,
          queue_len: row.queueLen,
          est_wait_time_min: row.estWaitTimeMin ?? 0,
          data_type: row.dataType || 'observed',
        }));

        const latency = Date.now() - startTime;
        log(`[Latest] DDB OK: date=${dateParam} ts=${latestTimestamp} rows=${rows.length} ageSec=${ageSec} latencyMs=${latency}`);

        return res.json(result);
      } catch (error) {
        const latency = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logError(`[Latest] DDB_FAIL: ${errorMessage} latencyMs=${latency}`, error);
        return res.status(503).json({ error: 'DynamoDB unavailable' });
      }
    }
    // 2. PAST -> S3 (Latest in that day)
    else if (!isToday && isS3WaitingEnabled()) {
      const s3Result = await getWaitingDataFromS3(dateParam);

      if (s3Result.success && s3Result.data && s3Result.data.length > 0) {
        // Sort DESC, take first group
        const sorted = s3Result.data.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        const latestTimestamp = sorted[0].timestamp;
        const latestItems = sorted.filter(item => item.timestamp === latestTimestamp);

        return res.json(latestItems.map(item => ({
          timestamp: item.timestamp,
          restaurantId: item.restaurantId,
          cornerId: item.cornerId,
          queue_len: item.queueLen,
          est_wait_time_min: item.estWaitTimeMin,
          data_type: 'archived'
        })));
      }

      return res.json([]); // Return empty if no S3 data
    }

    // Fallback? NO. strict SSOT means if DB is disabled, we return error.
    return res.status(503).json({ error: 'DynamoDB waiting source is disabled' });
  });


}
