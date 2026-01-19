/**
 * simulator.ts - Beta Day Simulator
 * 
 * Purpose: Generates simulated real-time waiting data for beta testing on 2026-01-20.
 * 
 * Features:
 * - Targets a specific date (2026-01-20 KST)
 * - 30-second cadence
 * - Only generates data for active corners (per schedule)
 * - Full snapshot for all active corners each tick
 * - Stops automatically when KST date changes
 * - Uses INGESTION_TOKEN for authentication (never logged)
 * 
 * Usage:
 *   INGESTION_TOKEN=$INGESTION_TOKEN npx tsx scripts/simulator.ts
 * 
 * Or add to package.json scripts:
 *   "simulate:beta": "tsx scripts/simulator.ts"
 */

import { CORNER_SCHEDULES, isCornerActive } from '../shared/domain/schedule';
import { RESTAURANTS } from '../shared/types';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  targetDate: '2026-01-20',
  cadenceMs: 30000, // 30 seconds
  source: 'simulator_beta_v1',
  ingestionUrl: process.env.INGESTION_URL || 'http://localhost:5000/api/ingest/waiting',
};

// ============================================================================
// KST Timezone Utilities
// ============================================================================

function getKSTDateKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getKSTISOTimestamp(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}+09:00`;
}

function getKSTTimeHHMM(): string {
  const ts = getKSTISOTimestamp();
  return ts.slice(11, 16); // "HH:MM"
}

// ============================================================================
// Queue Length Generation
// ============================================================================

const BASE_QUEUES: Record<string, number> = {
  korean: 8,
  western: 6,
  ramen: 4,
  instant: 3,
  cupbap: 2,
  breakfast_1000: 3,
  set_meal: 5,
  single_dish: 4,
  rice_bowl: 3,
  dinner: 4,
  dam_a_lunch: 6,
  pangeos_lunch: 5,
  dam_a_dinner: 3,
};

function generateQueueLen(cornerId: string, timeHHMM: string): number {
  const base = BASE_QUEUES[cornerId] || 5;
  const [h, m] = timeHHMM.split(':').map(Number);
  const minutes = h * 60 + m;
  
  // Peak multiplier: 12:00-13:00 is peak lunch
  let peakMultiplier = 1.0;
  if (minutes >= 720 && minutes < 780) {
    peakMultiplier = 1.5; // 12:00-13:00 peak
  } else if (minutes >= 690 && minutes < 720) {
    peakMultiplier = 1.2; // 11:30-12:00 ramp up
  } else if (minutes >= 780 && minutes < 810) {
    peakMultiplier = 1.3; // 13:00-13:30 ramp down
  } else if (minutes >= 480 && minutes < 540) {
    peakMultiplier = 1.2; // 08:00-09:00 breakfast peak
  } else if (minutes >= 1020 && minutes < 1080) {
    peakMultiplier = 1.3; // 17:00-18:00 dinner peak
  }
  
  // Random noise: ±2
  const noise = Math.floor(Math.random() * 5) - 2;
  return Math.max(0, Math.round(base * peakMultiplier) + noise);
}

// ============================================================================
// Ingestion
// ============================================================================

interface CornerData {
  restaurantId: string;
  cornerId: string;
  queue_len: number;
}

async function postIngestion(timestamp: string, corners: CornerData[]): Promise<void> {
  const token = process.env.INGESTION_TOKEN;
  if (!token) {
    console.error('[Simulator] ERROR: INGESTION_TOKEN not set');
    process.exit(1);
  }
  
  const payload = {
    timestamp,
    source: CONFIG.source,
    data_type: 'observed',
    corners,
  };
  
  try {
    const res = await fetch(CONFIG.ingestionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Token used but NEVER logged
      },
      body: JSON.stringify(payload),
    });
    
    const result = await res.json();
    
    // Log summary (no token, no full payload)
    const cornerSummary = corners.map(c => `${c.cornerId}:${c.queue_len}`).join(', ');
    console.log(`[Simulator] ${timestamp.slice(11, 19)} → ${corners.length} corners [${cornerSummary}] → ${JSON.stringify(result)}`);
  } catch (error) {
    console.error(`[Simulator] Ingestion failed:`, error);
  }
}

// ============================================================================
// Main Loop
// ============================================================================

async function runSimulator(): Promise<void> {
  console.log('='.repeat(60));
  console.log('[Simulator] HY-eat Beta Simulator');
  console.log(`[Simulator] Target date: ${CONFIG.targetDate} (KST)`);
  console.log(`[Simulator] Cadence: ${CONFIG.cadenceMs / 1000}s`);
  console.log(`[Simulator] Ingestion URL: ${CONFIG.ingestionUrl}`);
  console.log(`[Simulator] Auth: token ${process.env.INGESTION_TOKEN ? 'PRESENT' : 'MISSING!'}`);
  console.log('='.repeat(60));
  
  if (!process.env.INGESTION_TOKEN) {
    console.error('[Simulator] FATAL: INGESTION_TOKEN environment variable not set');
    console.error('[Simulator] Run with: INGESTION_TOKEN=<token> npx tsx scripts/simulator.ts');
    process.exit(1);
  }
  
  let tickCount = 0;
  
  while (true) {
    const currentDate = getKSTDateKey();
    
    // STOP CONDITION: Date changed from target
    if (currentDate !== CONFIG.targetDate) {
      console.log('='.repeat(60));
      console.log(`[Simulator] STOP: Date changed to ${currentDate} (target was ${CONFIG.targetDate})`);
      console.log(`[Simulator] Total ticks: ${tickCount}`);
      console.log('[Simulator] Exiting gracefully.');
      console.log('='.repeat(60));
      break;
    }
    
    const timestamp = getKSTISOTimestamp();
    const timeHHMM = getKSTTimeHHMM();
    tickCount++;
    
    // Collect active corners
    const corners: CornerData[] = [];
    
    for (const restaurant of RESTAURANTS) {
      for (const cornerId of restaurant.cornerOrder) {
        const isActive = isCornerActive({
          restaurantId: restaurant.id,
          cornerId,
          dateKey: CONFIG.targetDate,
          timeHHMM,
        });
        
        if (isActive) {
          corners.push({
            restaurantId: restaurant.id,
            cornerId,
            queue_len: generateQueueLen(cornerId, timeHHMM),
          });
        }
      }
    }
    
    if (corners.length > 0) {
      await postIngestion(timestamp, corners);
    } else {
      console.log(`[Simulator] ${timeHHMM}: No active corners, skipping ingestion (tick ${tickCount})`);
    }
    
    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, CONFIG.cadenceMs));
  }
  
  process.exit(0);
}

// ============================================================================
// Entry Point
// ============================================================================

runSimulator().catch(err => {
  console.error('[Simulator] Fatal error:', err);
  process.exit(1);
});
