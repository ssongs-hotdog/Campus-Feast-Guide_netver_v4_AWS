/**
 * waitTime.ts - Wait Time Domain Logic
 * 
 * Purpose: Contains the core business logic for estimating wait times.
 * This module is PURE and TESTABLE - it has no UI imports or side effects.
 * 
 * Why this exists:
 * The wait time estimation logic is separated from the UI so it can be:
 * 1. Easily tested in isolation
 * 2. Updated without touching UI code
 * 3. Potentially run on the server side
 * 
 * Future improvements:
 * - Add machine learning model integration
 * - Consider time of day, day of week factors
 * - Account for special events or holidays
 */

import type { CongestionLevel } from '@shared/types';

/**
 * Input parameters for wait time estimation.
 */
export interface WaitTimeInput {
  queueLength: number;
  restaurantId: string;
  cornerId: string;
}

/**
 * Output of wait time estimation.
 */
export interface WaitTimeOutput {
  estimatedWaitMinutes: number;
  congestionLevel: CongestionLevel;
}

/**
 * Service rate per minute for different corners.
 * This represents how many customers can be served per minute on average.
 * 
 * Why different rates?
 * - Ramen takes longer to prepare than pre-made items
 * - Different corners have different staffing levels
 * - Some food types require more cooking time
 */
const SERVICE_RATES: Record<string, Record<string, number>> = {
  hanyang_plaza: {
    western: 3.0,    // Pre-fried cutlets, fast service
    korean: 2.5,     // Standard rice dishes
    instant: 2.0,    // Made-to-order, slightly slower
    ramen: 1.5,      // Cooking time required
  },
  materials: {
    set_meal: 2.5,   // Standard cafeteria pace
    single_dish: 2.0,
  },
  life_science: {
    dam_a: 2.0,      // Similar to materials
    pangeos: 1.8,    // Slightly more complex dishes
  },
};

const DEFAULT_SERVICE_RATE = 2.0; // customers per minute

/**
 * Estimates wait time based on queue length and corner characteristics.
 * 
 * @param input - Queue length, restaurant ID, and corner ID
 * @returns Estimated wait time in minutes and congestion level
 * 
 * Example:
 *   estimateWaitTime({ queueLength: 10, restaurantId: 'hanyang_plaza', cornerId: 'ramen' })
 *   → { estimatedWaitMinutes: 7, congestionLevel: 3 }
 */
export function estimateWaitTime(input: WaitTimeInput): WaitTimeOutput {
  const { queueLength, restaurantId, cornerId } = input;
  
  // Get service rate for this corner (or default)
  const restaurantRates = SERVICE_RATES[restaurantId] || {};
  const serviceRate = restaurantRates[cornerId] || DEFAULT_SERVICE_RATE;
  
  // Simple estimation: queue_length / service_rate
  // Add a small base time for order processing
  const baseTime = 0.5; // 30 seconds base
  const rawWaitMinutes = (queueLength / serviceRate) + baseTime;
  
  // Round to nearest integer
  const estimatedWaitMinutes = Math.round(rawWaitMinutes);
  
  // Determine congestion level
  const congestionLevel = getCongestionLevel(estimatedWaitMinutes);
  
  return {
    estimatedWaitMinutes,
    congestionLevel,
  };
}

/**
 * Determines congestion level based on estimated wait time.
 * 
 * @param estimatedWaitMinutes - The estimated wait time in minutes
 * @returns A congestion level from 1 (very low) to 5 (very high)
 * 
 * Thresholds:
 * - 0-2 min → Level 1 (매우여유) - Very comfortable
 * - 3-5 min → Level 2 (여유) - Comfortable  
 * - 6-9 min → Level 3 (보통) - Normal
 * - 10-12 min → Level 4 (혼잡) - Crowded
 * - 13+ min → Level 5 (매우혼잡) - Very crowded
 */
export function getCongestionLevel(estimatedWaitMinutes: number): CongestionLevel {
  if (estimatedWaitMinutes <= 2) return 1;
  if (estimatedWaitMinutes <= 5) return 2;
  if (estimatedWaitMinutes <= 9) return 3;
  if (estimatedWaitMinutes <= 12) return 4;
  return 5;
}

/**
 * Batch estimation for multiple corners.
 * Useful when loading data for an entire restaurant or all restaurants.
 * 
 * @param inputs - Array of queue snapshots
 * @returns Array of wait time results
 */
export function estimateWaitTimes(
  inputs: WaitTimeInput[]
): WaitTimeOutput[] {
  return inputs.map(estimateWaitTime);
}
