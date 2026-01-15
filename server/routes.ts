import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import * as fs from "fs";
import * as path from "path";

interface WaitingDataRow {
  timestamp: string;
  restaurantId: string;
  cornerId: string;
  queue_len: number;
  est_wait_time_min: number;
}

let cachedWaitingData: WaitingDataRow[] | null = null;
let cachedTimestamps: string[] | null = null;

function parseCSV(content: string): WaitingDataRow[] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length < 2) return [];
  
  const data: WaitingDataRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length >= 5) {
      data.push({
        timestamp: values[0],
        restaurantId: values[1],
        cornerId: values[2],
        queue_len: parseInt(values[3], 10) || 0,
        est_wait_time_min: parseInt(values[4], 10) || 0,
      });
    }
  }
  
  return data;
}

function loadWaitingData(): { data: WaitingDataRow[]; timestamps: string[] } {
  if (cachedWaitingData && cachedTimestamps) {
    return { data: cachedWaitingData, timestamps: cachedTimestamps };
  }
  
  const csvPath = path.join(process.cwd(), 'data', 'waiting_peak_popularity_realistic_v2.csv');
  
  try {
    if (!fs.existsSync(csvPath)) {
      console.log('CSV file not found at:', csvPath);
      return { data: [], timestamps: [] };
    }
    
    const content = fs.readFileSync(csvPath, 'utf-8');
    cachedWaitingData = parseCSV(content);
    
    const timestampSet = new Set<string>();
    cachedWaitingData.forEach((row) => timestampSet.add(row.timestamp));
    cachedTimestamps = Array.from(timestampSet).sort();
    
    console.log(`Loaded ${cachedWaitingData.length} waiting data rows, ${cachedTimestamps.length} unique timestamps`);
    
    return { data: cachedWaitingData, timestamps: cachedTimestamps };
  } catch (error) {
    console.error('Error loading CSV:', error);
    return { data: [], timestamps: [] };
  }
}

function loadMenuData(): Record<string, unknown> | null {
  const menuPath = path.join(process.cwd(), 'data', 'menu.json');
  
  try {
    if (!fs.existsSync(menuPath)) {
      console.log('Menu file not found at:', menuPath);
      return null;
    }
    
    const content = fs.readFileSync(menuPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading menu:', error);
    return null;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get('/api/menu', (_req: Request, res: Response) => {
    const menuData = loadMenuData();
    if (!menuData) {
      return res.status(404).json({ error: 'Menu data not found' });
    }
    res.json(menuData);
  });

  app.get('/api/waiting/timestamps', (_req: Request, res: Response) => {
    const { timestamps } = loadWaitingData();
    res.json({ timestamps });
  });

  app.get('/api/waiting', (req: Request, res: Response) => {
    const { data, timestamps } = loadWaitingData();
    
    if (data.length === 0) {
      return res.json([]);
    }
    
    const timeParam = req.query.time as string | undefined;
    
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

  app.get('/api/waiting/all', (_req: Request, res: Response) => {
    const { data } = loadWaitingData();
    res.json(data);
  });

  return httpServer;
}
