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
 */
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import * as fs from "fs";
import * as path from "path";
import { computeWaitMinutes } from "./waitModel";
import { RESTAURANTS } from "../shared/types";

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

let cachedDataByDate: Record<string, CachedDataByDate> | null = null;

const TODAY_DATE = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

/**
 * Get available dates from the cached waiting data.
 * This dynamically derives dates from loaded CSV data instead of hardcoding.
 */
function getAvailableDates(): string[] {
  const cache = loadAllWaitingData();
  return Object.keys(cache).sort();
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

function loadAllWaitingData(): Record<string, CachedDataByDate> {
  if (cachedDataByDate) {
    return cachedDataByDate;
  }
  
  const csvPath = path.join(process.cwd(), 'data', 'hy_eat_queue_3days_combined.csv');
  
  try {
    if (!fs.existsSync(csvPath)) {
      console.log('CSV file not found at:', csvPath);
      cachedDataByDate = {};
      return cachedDataByDate;
    }
    
    const content = fs.readFileSync(csvPath, 'utf-8');
    const allData = parseCSV(content);
    
    cachedDataByDate = {};
    
    // Derive unique dates from timestamps dynamically (no hardcoding)
    const dateSet = new Set<string>();
    for (const row of allData) {
      // Extract date portion from ISO timestamp (YYYY-MM-DD)
      const dateStr = row.timestamp.split('T')[0];
      if (dateStr) {
        dateSet.add(dateStr);
      }
    }
    
    // Group data by date
    for (const dateStr of Array.from(dateSet)) {
      const dateData = allData.filter(row => row.timestamp.startsWith(dateStr));
      const timestampSet = new Set<string>();
      dateData.forEach(row => timestampSet.add(row.timestamp));
      const timestamps = Array.from(timestampSet).sort();
      
      cachedDataByDate[dateStr] = { data: dateData, timestamps };
    }
    
    const derivedDates = Object.keys(cachedDataByDate).sort();
    console.log(`Loaded ${allData.length} waiting data rows for ${derivedDates.length} dates: ${derivedDates.join(', ')}`);
    
    return cachedDataByDate;
  } catch (error) {
    console.error('Error loading CSV:', error);
    cachedDataByDate = {};
    return cachedDataByDate;
  }
}

function loadWaitingData(date?: string): { data: WaitingDataRow[]; timestamps: string[] } {
  const allData = loadAllWaitingData();
  const targetDate = date || TODAY_DATE;
  
  if (allData[targetDate]) {
    return allData[targetDate];
  }
  
  return { data: [], timestamps: [] };
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

let cachedMenusByDate: Record<string, Record<string, unknown>> | null = null;

/**
 * Validates menu data against the canonical restaurant/corner IDs.
 * Logs warnings for unknown restaurant or corner IDs.
 * This runs once when loading/caching and does NOT throw errors.
 * 
 * Key concepts:
 * - cornerId: Stable internal identifier that MUST match RESTAURANTS[].cornerOrder
 * - cornerDisplayName: User-facing name that can change freely
 * - To add dummy/real data, use the same cornerId keys as defined in shared/types.ts
 */
function validateMenuData(menusByDate: Record<string, Record<string, unknown>>): void {
  // Build lookup maps from canonical RESTAURANTS config
  const validRestaurantIds = new Set(RESTAURANTS.map(r => r.id));
  const cornerOrderByRestaurant = new Map(
    RESTAURANTS.map(r => [r.id, new Set(r.cornerOrder)])
  );
  
  for (const dateKey of Object.keys(menusByDate)) {
    const dateMenus = menusByDate[dateKey] as Record<string, Record<string, unknown>>;
    if (!dateMenus || typeof dateMenus !== 'object') continue;
    
    for (const restaurantId of Object.keys(dateMenus)) {
      // Check if restaurant ID is valid
      if (!validRestaurantIds.has(restaurantId)) {
        console.warn(
          `[Menu Validation] Unknown restaurantId "${restaurantId}" in date ${dateKey}. ` +
          `Valid IDs: ${Array.from(validRestaurantIds).join(', ')}`
        );
        continue;
      }
      
      // Check corner IDs for this restaurant
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

function loadMenusByDate(): Record<string, Record<string, unknown>> | null {
  if (cachedMenusByDate) {
    return cachedMenusByDate;
  }
  
  const menuPath = path.join(process.cwd(), 'data', 'menus_by_date.json');
  
  try {
    if (!fs.existsSync(menuPath)) {
      console.log('Menus by date file not found at:', menuPath);
      return null;
    }
    
    const content = fs.readFileSync(menuPath, 'utf-8');
    cachedMenusByDate = JSON.parse(content);
    console.log(`Loaded menus for ${Object.keys(cachedMenusByDate!).length} dates`);
    
    // Validate menu data against canonical restaurant/corner IDs
    validateMenuData(cachedMenusByDate!);
    
    return cachedMenusByDate;
  } catch (error) {
    console.error('Error loading menus by date:', error);
    return null;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get('/api/dates', (_req: Request, res: Response) => {
    res.json({ dates: getAvailableDates(), today: TODAY_DATE });
  });

  app.get('/api/menu', (req: Request, res: Response) => {
    const dateParam = req.query.date as string | undefined;
    const menusByDate = loadMenusByDate();
    
    if (!menusByDate) {
      return res.status(404).json({ error: 'Menu data not found' });
    }
    
    const targetDate = dateParam || TODAY_DATE;
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

  return httpServer;
}
