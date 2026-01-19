/**
 * simulator.ts - Beta Day Simulator (Workflow-Ready)
 * 
 * Purpose: Generates simulated real-time waiting data for beta testing on 2026-01-20.
 * 
 * Features:
 * - Targets a specific date (2026-01-20 KST)
 * - 30-second cadence during beta day
 * - Only generates data for active corners (per schedule)
 * - Full snapshot for all active corners each tick
 * - PRE-BETA: Sleeps and re-checks every 60s until beta day arrives
 * - POST-BETA: Stops gracefully with exit code 0 when date becomes 2026-01-21
 * - Uses INGESTION_TOKEN from Replit Secrets (never logged)
 * - Graceful error handling: logs failures, retries on next tick (no crash)
 * 
 * Workflow Usage:
 *   Runs automatically via "simulator-beta" workflow.
 *   Reads INGESTION_TOKEN from environment (Replit Secrets).
 * 
 * Manual Usage:
 *   INGESTION_TOKEN=$INGESTION_TOKEN npx tsx scripts/simulator.ts
 */

import { CORNER_SCHEDULES, isCornerActive } from '../shared/domain/schedule';
import { RESTAURANTS } from '../shared/types';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  targetDate: '2026-01-20',
  postBetaDate: '2026-01-21', // Stop when this date arrives
  cadenceMs: 30000, // 30 seconds during beta
  preBetaCheckMs: 60000, // 60 seconds pre-beta check interval
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

async function postIngestion(timestamp: string, corners: CornerData[]): Promise<boolean> {
  const token = process.env.INGESTION_TOKEN;
  if (!token) {
    console.error('[Simulator] ERROR: INGESTION_TOKEN not set (will retry next tick)');
    return false;
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
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      console.error(`[Simulator] Ingestion HTTP error: ${res.status} ${res.statusText} (will retry next tick)`);
      return false;
    }
    
    const result = await res.json();
    
    const cornerSummary = corners.map(c => `${c.cornerId}:${c.queue_len}`).join(', ');
    console.log(`[Simulator] ${timestamp.slice(11, 19)} → ${corners.length} corners [${cornerSummary}] → ${JSON.stringify(result)}`);
    return true;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Simulator] Ingestion failed: ${errMsg} (will retry next tick)`);
    return false;
  }
}

// ============================================================================
// Main Loop
// ============================================================================

async function waitForBetaDay(): Promise<void> {
  console.log('[Simulator] PRE-BETA: Waiting for beta day to start...');
  
  while (true) {
    const currentDate = getKSTDateKey();
    
    if (currentDate >= CONFIG.postBetaDate) {
      console.log(`[Simulator] POST-BETA: Date is ${currentDate}, beta already ended. Exiting.`);
      process.exit(0);
    }
    
    if (currentDate === CONFIG.targetDate) {
      console.log(`[Simulator] Beta day arrived! Starting ingestion loop.`);
      return;
    }
    
    console.log(`[Simulator] Current KST date: ${currentDate}, waiting for ${CONFIG.targetDate}... (checking every 60s)`);
    await new Promise(resolve => setTimeout(resolve, CONFIG.preBetaCheckMs));
  }
}

async function runSimulator(): Promise<void> {
  console.log('='.repeat(60));
  console.log('[Simulator] HY-eat Beta Simulator (Workflow-Ready)');
  console.log(`[Simulator] Target date: ${CONFIG.targetDate} (KST)`);
  console.log(`[Simulator] Post-beta date: ${CONFIG.postBetaDate} (will exit gracefully)`);
  console.log(`[Simulator] Cadence: ${CONFIG.cadenceMs / 1000}s during beta`);
  console.log(`[Simulator] Pre-beta check interval: ${CONFIG.preBetaCheckMs / 1000}s`);
  console.log(`[Simulator] Ingestion URL: ${CONFIG.ingestionUrl}`);
  console.log(`[Simulator] Auth: token ${process.env.INGESTION_TOKEN ? 'PRESENT' : 'MISSING!'}`);
  console.log('='.repeat(60));
  
  if (!process.env.INGESTION_TOKEN) {
    console.error('[Simulator] WARNING: INGESTION_TOKEN not set. Will check again on each tick.');
  }
  
  // Wait for beta day if not already
  const currentDate = getKSTDateKey();
  if (currentDate < CONFIG.targetDate) {
    await waitForBetaDay();
  } else if (currentDate >= CONFIG.postBetaDate) {
    console.log(`[Simulator] POST-BETA: Date is ${currentDate}, beta already ended. Exiting gracefully.`);
    process.exit(0);
  }
  
  let tickCount = 0;
  let successCount = 0;
  let failCount = 0;
  
  while (true) {
    const currentDate = getKSTDateKey();
    
    // POST-BETA STOP: Date changed past target
    if (currentDate >= CONFIG.postBetaDate) {
      console.log('='.repeat(60));
      console.log(`[Simulator] POST-BETA STOP: Date is now ${currentDate}`);
      console.log(`[Simulator] Total ticks: ${tickCount}, success: ${successCount}, failed: ${failCount}`);
      console.log('[Simulator] Beta completed. Exiting gracefully with code 0.');
      console.log('='.repeat(60));
      break;
    }
    
    // Safety check: still on target date
    if (currentDate !== CONFIG.targetDate) {
      console.log(`[Simulator] Unexpected date ${currentDate}, waiting for ${CONFIG.targetDate}...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.preBetaCheckMs));
      continue;
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
      const success = await postIngestion(timestamp, corners);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
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
