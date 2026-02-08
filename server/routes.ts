/**
 * routes.ts - API Route Definitions
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
import { computeWaitMinutes } from "./waitModel";
import { validate, DateParamSchema, DateTimeQuerySchema } from "./utils/validation"; // [New] Import Validation
import { log, logError } from "./utils/logger"; // [New] Import Logger

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

    try {
      if (isDdbWaitingEnabled()) {
        const timestamps = await ddbGetTimestampsByDate(targetDate);
        return res.json({ timestamps });
      }

      // If DDB is disabled, we cannot serve this request
      return res.status(503).json({ error: 'DynamoDB waiting source is disabled' });
    } catch (error) {
      logError('[API] timestamps query failed:', error);
      return res.status(503).json({ error: 'Database unavailable' });
    }
  });

  // [New] Applied validation middleware for both date and time
  app.get('/api/waiting', validate(DateTimeQuerySchema), async (req: Request, res: Response) => {
    const dateParam = req.query.date as string | undefined;
    const timeParam = req.query.time as string | undefined;

    // Manual Regex checks removed - Zod handled them

    const targetDate = dateParam || getTodayDateKey();

    try {
      if (isDdbWaitingEnabled()) {
        const allData = await ddbGetAllDataByDate(targetDate, computeWaitMinutes);

        let filtered = allData;

        if (timeParam) {
          if (timeParam.includes('T') || timeParam.includes('+')) {
            // ISO timestamp match
            filtered = allData.filter(row => row.timestamp === timeParam);
          } else {
            // HH:MM aggregation match logic (5-min bucket)
            const [hours, minutes] = timeParam.split(':').map(Number);

            // Filter data that falls within [HH:MM, HH:MM+5)
            // e.g. 12:00 -> 12:00:00 ~ 12:04:59
            filtered = allData.filter(row => {
              // row.timestamp is ISO string (e.g. 2023-01-01T12:01:30+09:00)
              const date = new Date(row.timestamp);
              const h = date.getHours();
              const m = date.getMinutes();

              if (h !== hours) return false;
              // Check 5-minute bucket
              const bucketStart = Math.floor(m / 5) * 5;
              return bucketStart === minutes;
            });
          }
        } else {
          // No time param -> return latest in that day
          if (allData.length > 0) {
            const latestTs = allData[allData.length - 1].timestamp;
            filtered = allData.filter(row => row.timestamp === latestTs);
          } else {
            filtered = [];
          }
        }

        // Fix snake_case to camelCase mismatch for frontend (WaitingData interface)
        // Defensive check: support both snake_case (legacy) and camelCase (new) from DDB
        const mapped = filtered.map(row => {
          // Check both, fallback to 0 or defaults if missing
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

    try {
      if (isDdbWaitingEnabled()) {
        const data = await ddbGetAllDataByDate(targetDate, computeWaitMinutes);
        return res.json(data);
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
      const result = await getPredictionByDayAndTime(dayOfWeek, timeParam, computeWaitMinutes);

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

    res.json({
      status: 'ok',
      timestamp: now,
      services: {
        dynamoDB: {
          enabled: isDdbWaitingEnabled(),
          connected: ddbStatus,
        },
        s3: {
          enabled: s3Enabled,
          cache: menuCacheStats,
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

    res.json({
      status: 'ok',
      timestamp: now,
      services: {
        dynamoDB: {
          enabled: isDdbWaitingEnabled(),
          connected: ddbStatus,
        },
        s3: {
          enabled: s3Enabled,
          cache: menuCacheStats,
        }
      }
    });
  });

  // [New] Applied validation middleware
  app.get('/api/waiting/latest', validate(DateParamSchema), async (req: Request, res: Response) => {
    const startTime = Date.now();
    const dateParam = (req.query.date as string) || getTodayDateKey();

    if (isDdbWaitingEnabled()) {
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
          est_wait_time_min: computeWaitMinutes(row.queueLen, row.restaurantId, row.cornerId),
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

    // Fallback? NO. strict SSOT means if DB is disabled, we return error.
    return res.status(503).json({ error: 'DynamoDB waiting source is disabled' });
  });


}
