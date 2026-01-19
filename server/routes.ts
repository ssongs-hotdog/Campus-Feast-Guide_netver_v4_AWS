/**
 * routes.ts - API Route Definitions
 * 
 * Purpose: Defines all REST API endpoints for the HY-eat application.
 * This is the server-side data access layer that serves:
 * - Menu data (from JSON files)
 * - Waiting/queue data (from CSV files)
 * - Timestamp listings for data navigation
 * 
 * How to add new endpoints:
 * 1. Add a new app.get() or app.post() call inside registerRoutes()
 * 2. Use the loadWaitingData() or loadMenusByDate() helpers to access data
 * 
 * How to switch to a real database:
 * 1. Replace the file-loading functions with database queries
 * 2. The API response format should stay the same
 * 
 * Phase 1 Updates:
 * - Atomic cache swap via globalCache object
 * - POST /api/admin/reload endpoint for hot reload
 * - Dev-only file watcher (NODE_ENV !== 'production')
 */
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { 
  storage, 
  upsertWaitingSnapshots, 
  getWaitingSnapshotCount, 
  getKSTDateKey,
  getKSTISOTimestamp,
  getLatestWaitingByDate,
  getLastIngestionTime,
  checkDbConnection,
} from "./storage";
import * as fs from "fs";
import * as path from "path";
import { computeWaitMinutes } from "./waitModel";
import { RESTAURANTS } from "../shared/types";

const VALID_RESTAURANT_IDS = new Set(RESTAURANTS.map(r => r.id));
const CORNERS_BY_RESTAURANT = new Map(
  RESTAURANTS.map(r => [r.id, new Set(r.cornerOrder)])
);

interface WaitingDataRow {
  timestamp: string;
  restaurantId: string;
  cornerId: string;
  queue_len: number;
  est_wait_time_min: number;
  data_type?: string;
}

interface CachedDataByDate {
  data: WaitingDataRow[];
  timestamps: string[];
}

interface GlobalCache {
  waiting: Record<string, CachedDataByDate>;
  menus: Record<string, Record<string, unknown>>;
}

let globalCache: GlobalCache = {
  waiting: {},
  menus: {},
};

let cacheInitialized = false;

const USE_DB_WAITING = process.env.USE_DB_WAITING === 'true';
const WAITING_STALE_SECONDS = parseInt(process.env.WAITING_STALE_SECONDS || '90', 10);

function getTodayDateKey(): string {
  return getKSTDateKey();
}

function getAvailableDates(): string[] {
  ensureCacheInitialized();
  return Object.keys(globalCache.waiting).sort();
}

function parseCSV(content: string): WaitingDataRow[] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length < 2) return [];
  
  const data: WaitingDataRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length >= 4) {
      const timestamp = values[0];
      const restaurantId = values[1];
      const cornerId = values[2];
      const queueLen = parseInt(values[3], 10) || 0;
      const dataType = values[4] || 'observed';
      
      data.push({
        timestamp,
        restaurantId,
        cornerId,
        queue_len: queueLen,
        est_wait_time_min: computeWaitMinutes(queueLen, restaurantId, cornerId),
        data_type: dataType,
      });
    }
  }
  
  return data;
}

function reloadWaitingCache(): Record<string, CachedDataByDate> {
  const csvPath = path.join(process.cwd(), 'data', 'hy_eat_queue_3days_combined.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.log('CSV file not found at:', csvPath);
    return {};
  }
  
  const content = fs.readFileSync(csvPath, 'utf-8');
  const allData = parseCSV(content);
  
  const newCache: Record<string, CachedDataByDate> = {};
  
  const dateSet = new Set<string>();
  for (const row of allData) {
    const dateStr = row.timestamp.split('T')[0];
    if (dateStr) {
      dateSet.add(dateStr);
    }
  }
  
  for (const dateStr of Array.from(dateSet)) {
    const dateData = allData.filter(row => row.timestamp.startsWith(dateStr));
    const timestampSet = new Set<string>();
    dateData.forEach(row => timestampSet.add(row.timestamp));
    const timestamps = Array.from(timestampSet).sort();
    
    newCache[dateStr] = { data: dateData, timestamps };
  }
  
  const derivedDates = Object.keys(newCache).sort();
  console.log(`[Reload] Loaded ${allData.length} waiting data rows for ${derivedDates.length} dates: ${derivedDates.join(', ')}`);
  
  return newCache;
}

function validateMenuData(menusByDate: Record<string, Record<string, unknown>>): void {
  const validRestaurantIds = new Set(RESTAURANTS.map(r => r.id));
  const cornerOrderByRestaurant = new Map(
    RESTAURANTS.map(r => [r.id, new Set(r.cornerOrder)])
  );
  
  for (const dateKey of Object.keys(menusByDate)) {
    const dateMenus = menusByDate[dateKey] as Record<string, Record<string, unknown>>;
    if (!dateMenus || typeof dateMenus !== 'object') continue;
    
    for (const restaurantId of Object.keys(dateMenus)) {
      if (!validRestaurantIds.has(restaurantId)) {
        console.warn(
          `[Menu Validation] Unknown restaurantId "${restaurantId}" in date ${dateKey}. ` +
          `Valid IDs: ${Array.from(validRestaurantIds).join(', ')}`
        );
        continue;
      }
      
      const cornerMenus = dateMenus[restaurantId] as Record<string, unknown>;
      if (!cornerMenus || typeof cornerMenus !== 'object') continue;
      
      const validCornerIds = cornerOrderByRestaurant.get(restaurantId)!;
      for (const cornerId of Object.keys(cornerMenus)) {
        if (!validCornerIds.has(cornerId)) {
          console.warn(
            `[Menu Validation] Unknown cornerId "${cornerId}" for restaurant "${restaurantId}" in date ${dateKey}. ` +
            `Valid IDs: ${Array.from(validCornerIds).join(', ')}`
          );
        }
      }
    }
  }
}

function reloadMenusCache(): Record<string, Record<string, unknown>> {
  const menuPath = path.join(process.cwd(), 'data', 'menus_by_date.json');
  
  if (!fs.existsSync(menuPath)) {
    console.log('Menus by date file not found at:', menuPath);
    return {};
  }
  
  const content = fs.readFileSync(menuPath, 'utf-8');
  const parsed = JSON.parse(content);
  
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid menus JSON: not an object');
  }
  
  console.log(`[Reload] Loaded menus for ${Object.keys(parsed).length} dates`);
  validateMenuData(parsed);
  
  return parsed;
}

function ensureCacheInitialized(): void {
  if (cacheInitialized) return;
  
  try {
    const newWaiting = reloadWaitingCache();
    const newMenus = reloadMenusCache();
    globalCache = { waiting: newWaiting, menus: newMenus };
    cacheInitialized = true;
  } catch (error) {
    console.error('Error initializing cache:', error);
    globalCache = { waiting: {}, menus: {} };
    cacheInitialized = true;
  }
}

function loadWaitingData(date?: string): { data: WaitingDataRow[]; timestamps: string[] } {
  ensureCacheInitialized();
  const targetDate = date || getTodayDateKey();
  
  if (globalCache.waiting[targetDate]) {
    return globalCache.waiting[targetDate];
  }
  
  return { data: [], timestamps: [] };
}

function loadMenusByDate(): Record<string, Record<string, unknown>> | null {
  ensureCacheInitialized();
  return Object.keys(globalCache.menus).length > 0 ? globalCache.menus : null;
}

function extractKSTHoursMinutes(timestamp: string): { hours: number; minutes: number } {
  const match = timestamp.match(/T(\d{2}):(\d{2})/);
  if (!match) return { hours: 0, minutes: 0 };
  return { hours: parseInt(match[1], 10), minutes: parseInt(match[2], 10) };
}

function compute5MinAggregatedSnapshot(
  data: WaitingDataRow[],
  timestamps: string[],
  timeHHMM: string
): WaitingDataRow[] {
  const [hours, minutes] = timeHHMM.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return [];
  
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + 4;
  
  const relevantRows = data.filter(row => {
    const { hours: rHours, minutes: rMinutes } = extractKSTHoursMinutes(row.timestamp);
    const rowMinutes = rHours * 60 + rMinutes;
    return rowMinutes >= startMinutes && rowMinutes <= endMinutes;
  });
  
  const grouped: Record<string, { queueLens: number[]; row: WaitingDataRow }> = {};
  
  for (const row of relevantRows) {
    const key = `${row.restaurantId}:${row.cornerId}`;
    if (!grouped[key]) {
      grouped[key] = { queueLens: [], row };
    }
    grouped[key].queueLens.push(row.queue_len);
  }
  
  const result: WaitingDataRow[] = [];
  const firstTimestamp = timestamps.find(ts => {
    const { hours: tHours, minutes: tMinutes } = extractKSTHoursMinutes(ts);
    return tHours === hours && tMinutes === minutes;
  }) || timestamps[0];
  
  for (const key in grouped) {
    const { queueLens, row } = grouped[key];
    const avgQueueLen = Math.round(queueLens.reduce((a, b) => a + b, 0) / queueLens.length);
    
    result.push({
      timestamp: firstTimestamp,
      restaurantId: row.restaurantId,
      cornerId: row.cornerId,
      queue_len: avgQueueLen,
      est_wait_time_min: computeWaitMinutes(avgQueueLen, row.restaurantId, row.cornerId),
      data_type: row.data_type,
    });
  }
  
  return result;
}

function setupDevFileWatcher(): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  
  const dataDir = path.join(process.cwd(), 'data');
  
  if (!fs.existsSync(dataDir)) {
    console.warn('[Dev Watcher] data/ directory not found, skipping file watcher');
    return;
  }
  
  let debounceTimer: NodeJS.Timeout | null = null;
  
  try {
    fs.watch(dataDir, { persistent: false }, (eventType, filename) => {
      if (!filename) return;
      
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = setTimeout(() => {
        console.log(`[Dev Watcher] File change detected: ${filename}, reloading caches...`);
        
        try {
          const newWaiting = reloadWaitingCache();
          const newMenus = reloadMenusCache();
          globalCache = { waiting: newWaiting, menus: newMenus };
          console.log('[Dev Watcher] Caches reloaded successfully');
        } catch (error) {
          console.warn('[Dev Watcher] Reload failed, keeping old cache:', error);
        }
      }, 500);
    });
    
    console.log('[Dev Watcher] Watching data/ directory for changes');
  } catch (error) {
    console.warn('[Dev Watcher] Failed to setup file watcher:', error);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  ensureCacheInitialized();
  setupDevFileWatcher();
  
  app.post('/api/admin/reload', (req: Request, res: Response) => {
    const expectedToken = process.env.ADMIN_RELOAD_TOKEN;
    const authHeader = req.headers.authorization;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    try {
      const newWaiting = reloadWaitingCache();
      const newMenus = reloadMenusCache();
      
      globalCache = { waiting: newWaiting, menus: newMenus };
      
      const timestamp = new Date().toISOString();
      const waitingDates = Object.keys(newWaiting).sort();
      const menuDates = Object.keys(newMenus).sort();
      
      console.log(`[Admin Reload] Success at ${timestamp}: waiting=${waitingDates.length} dates, menus=${menuDates.length} dates`);
      
      return res.status(200).json({
        ok: true,
        reloaded: ['waiting', 'menus'],
        waitingDates,
        menuDates,
        timestamp,
      });
    } catch (error) {
      const timestamp = new Date().toISOString();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.warn(`[Admin Reload] Failed at ${timestamp}: ${errorMessage}`);
      
      return res.status(500).json({
        ok: false,
        error: errorMessage,
        timestamp,
      });
    }
  });

  app.get('/api/dates', (_req: Request, res: Response) => {
    res.json({ dates: getAvailableDates(), today: getTodayDateKey() });
  });

  app.get('/api/menu', (req: Request, res: Response) => {
    const dateParam = req.query.date as string | undefined;
    const menusByDate = loadMenusByDate();
    
    if (!menusByDate) {
      return res.status(404).json({ error: 'Menu data not found' });
    }
    
    const targetDate = dateParam || getTodayDateKey();
    const menuData = menusByDate[targetDate];
    
    if (!menuData) {
      return res.status(404).json({ error: `Menu data not found for date ${targetDate}` });
    }
    
    res.json(menuData);
  });

  app.get('/api/waiting/timestamps', (req: Request, res: Response) => {
    const dateParam = req.query.date as string | undefined;
    const { timestamps } = loadWaitingData(dateParam);
    res.json({ timestamps });
  });

  app.get('/api/waiting', (req: Request, res: Response) => {
    const dateParam = req.query.date as string | undefined;
    const { data, timestamps } = loadWaitingData(dateParam);
    
    if (data.length === 0) {
      return res.json([]);
    }
    
    const timeParam = req.query.time as string | undefined;
    const aggregateParam = req.query.aggregate as string | undefined;
    
    if (aggregateParam === '5min' && timeParam) {
      const aggregated = compute5MinAggregatedSnapshot(data, timestamps, timeParam);
      return res.json(aggregated);
    }
    
    if (!timeParam) {
      const latestTimestamp = timestamps[timestamps.length - 1];
      const filtered = data.filter((row) => row.timestamp === latestTimestamp);
      return res.json(filtered);
    }
    
    let targetTimestamp: string;
    
    if (timeParam.includes('T') || timeParam.includes('+')) {
      if (timestamps.includes(timeParam)) {
        targetTimestamp = timeParam;
      } else {
        const targetTime = new Date(timeParam).getTime();
        let closestTs = timestamps[0];
        let minDiff = Math.abs(new Date(timestamps[0]).getTime() - targetTime);
        
        for (const ts of timestamps) {
          const diff = Math.abs(new Date(ts).getTime() - targetTime);
          if (diff < minDiff) {
            minDiff = diff;
            closestTs = ts;
          }
        }
        targetTimestamp = closestTs;
      }
    } else {
      const [hours, minutes] = timeParam.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        return res.status(400).json({ error: 'Invalid time format. Use HH:MM or ISO timestamp' });
      }
      
      const targetMinutes = hours * 60 + minutes;
      let closestTs = timestamps[0];
      let minDiff = Infinity;
      
      for (const ts of timestamps) {
        const tsDate = new Date(ts);
        const tsMinutes = tsDate.getHours() * 60 + tsDate.getMinutes();
        const diff = Math.abs(tsMinutes - targetMinutes);
        
        if (diff < minDiff) {
          minDiff = diff;
          closestTs = ts;
        }
      }
      targetTimestamp = closestTs;
    }
    
    const filtered = data.filter((row) => row.timestamp === targetTimestamp);
    res.json(filtered);
  });

  app.get('/api/waiting/all', (req: Request, res: Response) => {
    const dateParam = req.query.date as string | undefined;
    const { data } = loadWaitingData(dateParam);
    res.json(data);
  });

  app.get('/api/config', (_req: Request, res: Response) => {
    res.json({ 
      useDbWaiting: USE_DB_WAITING,
      today: getTodayDateKey(),
    });
  });

  app.get('/api/health', async (_req: Request, res: Response) => {
    const now = getKSTISOTimestamp();
    
    try {
      const dbConnected = await checkDbConnection();
      
      if (!dbConnected) {
        return res.json({
          status: 'ok',
          timestamp: now,
          db: 'disconnected',
          lastIngestion: null,
          secondsSinceLastIngestion: null,
        });
      }

      const lastIngestion = await getLastIngestionTime();
      const lastIngestionIso = lastIngestion 
        ? lastIngestion.toISOString().replace('Z', '+00:00')
        : null;
      const secondsSinceLastIngestion = lastIngestion 
        ? Math.floor((Date.now() - lastIngestion.getTime()) / 1000)
        : null;

      res.json({
        status: 'ok',
        timestamp: now,
        db: 'connected',
        lastIngestion: lastIngestionIso,
        secondsSinceLastIngestion,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Health] DB error: ${errorMessage}`);
      
      res.json({
        status: 'ok',
        timestamp: now,
        db: 'disconnected',
        lastIngestion: null,
        secondsSinceLastIngestion: null,
        error: errorMessage,
      });
    }
  });

  app.get('/api/waiting/latest', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const dateParam = (req.query.date as string) || getTodayDateKey();
    
    if (!USE_DB_WAITING) {
      console.log(`[Latest] FALLBACK_TO_FILE: reason=USE_DB_WAITING disabled`);
      const { data, timestamps } = loadWaitingData(dateParam);
      
      if (data.length === 0) {
        return res.json([]);
      }
      
      const latestTimestamp = timestamps[timestamps.length - 1];
      const filtered = data.filter((row) => row.timestamp === latestTimestamp);
      return res.json(filtered);
    }

    try {
      const { rows, latestTimestamp } = await getLatestWaitingByDate(dateParam);
      
      if (rows.length === 0) {
        console.log(`[Latest] OK: date=${dateParam} ts=null rows=0 latencyMs=${Date.now() - startTime}`);
        return res.json([]);
      }

      const latestTime = new Date(latestTimestamp!).getTime();
      const nowTime = Date.now();
      const ageSec = Math.floor((nowTime - latestTime) / 1000);
      
      if (ageSec > WAITING_STALE_SECONDS) {
        const latency = Date.now() - startTime;
        console.log(`[Latest] STALE: date=${dateParam} latest=${latestTimestamp} ageSec=${ageSec} thresholdSec=${WAITING_STALE_SECONDS} latencyMs=${latency}`);
        return res.json([]);
      }

      const result: WaitingDataRow[] = rows.map(row => ({
        timestamp: latestTimestamp!,
        restaurantId: row.restaurantId,
        cornerId: row.cornerId,
        queue_len: row.queueLen,
        est_wait_time_min: computeWaitMinutes(row.queueLen, row.restaurantId, row.cornerId),
        data_type: row.dataType || 'observed',
      }));

      const latency = Date.now() - startTime;
      console.log(`[Latest] OK: date=${dateParam} ts=${latestTimestamp} rows=${rows.length} ageSec=${ageSec} latencyMs=${latency}`);
      
      return res.json(result);
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`[Latest] DB_FAIL: ${errorMessage} latencyMs=${latency}`);
      console.log(`[Latest] FALLBACK_TO_FILE: reason=DB error`);
      
      const { data, timestamps } = loadWaitingData(dateParam);
      
      if (data.length === 0) {
        return res.json([]);
      }
      
      const latestTimestamp = timestamps[timestamps.length - 1];
      const filtered = data.filter((row) => row.timestamp === latestTimestamp);
      return res.json(filtered);
    }
  });

  app.post('/api/ingest/waiting', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    const expectedToken = process.env.INGESTION_TOKEN;
    const authHeader = req.headers.authorization;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      console.log('[Ingest] AUTH_FAIL');
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      const body = req.body;
      
      if (!body || typeof body !== 'object') {
        console.log('[Ingest] REJECTED: Invalid request body');
        return res.status(400).json({ error: 'Invalid request body' });
      }

      const { timestamp, source, data_type, corners } = body;

      if (!timestamp || typeof timestamp !== 'string') {
        console.log('[Ingest] REJECTED: Missing or invalid timestamp');
        return res.status(400).json({ error: 'Missing or invalid timestamp' });
      }

      const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/;
      if (!timestampRegex.test(timestamp)) {
        console.log(`[Ingest] REJECTED: Invalid timestamp format "${timestamp}"`);
        return res.status(400).json({ 
          error: 'Invalid timestamp format. Required: YYYY-MM-DDTHH:mm:ss+09:00' 
        });
      }

      const incomingTime = new Date(timestamp).getTime();
      const maxAllowed = Date.now() + 60_000;
      if (incomingTime > maxAllowed) {
        console.log(`[Ingest] REJECTED: Timestamp too far in future "${timestamp}"`);
        return res.status(400).json({ error: 'Timestamp too far in future (max +60s)' });
      }

      if (!Array.isArray(corners) || corners.length === 0) {
        console.log('[Ingest] REJECTED: corners must be non-empty array');
        return res.status(400).json({ error: 'corners must be non-empty array' });
      }

      const validatedRows: Array<{
        timestamp: Date;
        restaurantId: string;
        cornerId: string;
        queueLen: number;
        dataType?: string;
        source?: string;
      }> = [];

      for (let i = 0; i < corners.length; i++) {
        const corner = corners[i];
        
        if (!corner || typeof corner !== 'object') {
          console.log(`[Ingest] REJECTED: corners[${i}] is not an object`);
          return res.status(400).json({ error: `corners[${i}] is not an object` });
        }

        const { restaurantId, cornerId, queue_len } = corner;

        if (!restaurantId || typeof restaurantId !== 'string') {
          console.log(`[Ingest] REJECTED: corners[${i}].restaurantId missing or invalid`);
          return res.status(400).json({ 
            error: `corners[${i}].restaurantId missing or invalid` 
          });
        }

        if (!VALID_RESTAURANT_IDS.has(restaurantId)) {
          console.log(`[Ingest] REJECTED: Invalid restaurantId "${restaurantId}"`);
          return res.status(400).json({ 
            error: `Invalid restaurantId "${restaurantId}". Valid: ${Array.from(VALID_RESTAURANT_IDS).join(', ')}` 
          });
        }

        if (!cornerId || typeof cornerId !== 'string') {
          console.log(`[Ingest] REJECTED: corners[${i}].cornerId missing or invalid`);
          return res.status(400).json({ 
            error: `corners[${i}].cornerId missing or invalid` 
          });
        }

        const validCorners = CORNERS_BY_RESTAURANT.get(restaurantId);
        if (!validCorners || !validCorners.has(cornerId)) {
          console.log(`[Ingest] REJECTED: Invalid cornerId "${cornerId}" for restaurant "${restaurantId}"`);
          return res.status(400).json({ 
            error: `Invalid cornerId "${cornerId}" for restaurant "${restaurantId}". Valid: ${validCorners ? Array.from(validCorners).join(', ') : 'none'}` 
          });
        }

        if (typeof queue_len !== 'number' || !Number.isInteger(queue_len) || queue_len < 0) {
          console.log(`[Ingest] REJECTED: corners[${i}].queue_len must be integer >= 0`);
          return res.status(400).json({ 
            error: `corners[${i}].queue_len must be integer >= 0` 
          });
        }

        validatedRows.push({
          timestamp: new Date(timestamp),
          restaurantId,
          cornerId,
          queueLen: queue_len,
          dataType: data_type || 'observed',
          source: source || undefined,
        });
      }

      const count = await upsertWaitingSnapshots(validatedRows);
      const latency = Date.now() - startTime;
      
      console.log(`[Ingest] OK: ${count} corners at ${timestamp} source=${source || 'unknown'} latency=${latency}ms`);
      
      return res.status(200).json({ 
        ok: true, 
        inserted: count, 
        timestamp,
        latencyMs: latency 
      });

    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Ingest] DB_FAIL: ${errorMessage} latency=${latency}ms`);
      return res.status(503).json({ error: 'Database error', details: errorMessage });
    }
  });

  return httpServer;
}
