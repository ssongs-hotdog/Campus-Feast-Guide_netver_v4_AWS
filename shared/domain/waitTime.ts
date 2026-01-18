/**
 * shared/domain/waitTime.ts - Canonical Wait Time Calculation
 * 
 * Purpose: Single source of truth for wait time estimation logic.
 * Used by both server (CSV parsing) and client (if needed for calculations).
 * 
 * This module is PURE and has no external dependencies beyond TypeScript.
 * 
 * Key concepts:
 * - Service rate: customers served per minute for each corner type
 * - Overhead: additional fixed time for certain corners (cooking time)
 * - Cap: maximum wait time to prevent unrealistic estimates
 */

/**
 * Service rates in people per minute for each corner type.
 * Higher values = faster service.
 * 
 * Note: These corner IDs must match those in the CSV data files.
 * CSV uses: dam_a, pangeos, instant, korean, ramen, set_meal, single_dish, western
 * The newer corner IDs (dam_a_lunch, pangeos_lunch, etc.) are aliases
 * that may appear in future data.
 */
const SERVICE_RATE_PEOPLE_PER_MIN: Record<string, number> = {
  western: 4.2,
  korean: 3.6,
  ramen: 1.6,
  instant: 2.35,
  cupbap: 3.0,
  breakfast_1000: 3.5,
  set_meal: 3.2,
  single_dish: 2.8,
  rice_bowl: 2.5,
  dinner: 2.8,
  dam_a: 2.9,
  dam_a_lunch: 2.9,
  dam_a_dinner: 2.9,
  pangeos: 2.35,
  pangeos_lunch: 2.35,
};

/**
 * Fixed overhead time in minutes for certain corner types.
 * Represents base cooking/preparation time.
 */
const OVERHEAD_MIN: Record<string, number> = {
  ramen: 1,
  instant: 1,
  pangeos: 1,
  pangeos_lunch: 1,
};

/**
 * Default service rate when corner is not in the lookup table.
 */
const DEFAULT_SERVICE_RATE = 2.5;

/**
 * Computes estimated wait time in minutes.
 * 
 * Formula: ceil(queue_len / service_rate + overhead)
 * Result is capped to prevent unrealistic estimates.
 * 
 * @param queueLen - Number of people in queue
 * @param restaurantId - Restaurant identifier
 * @param cornerId - Corner identifier
 * @returns Estimated wait time in minutes (integer)
 * 
 * Example:
 *   computeWaitMinutes(10, 'hanyang_plaza', 'ramen') → 8
 */
export function computeWaitMinutes(
  queueLen: number,
  restaurantId: string,
  cornerId: string
): number {
  const serviceRate = SERVICE_RATE_PEOPLE_PER_MIN[cornerId] ?? DEFAULT_SERVICE_RATE;
  const overhead = OVERHEAD_MIN[cornerId] ?? 0;

  let wait = Math.ceil(queueLen / serviceRate + overhead);

  const isInstantPlaza = restaurantId === 'hanyang_plaza' && cornerId === 'instant';
  const isPangeosLife = restaurantId === 'life_science' && 
    (cornerId === 'pangeos' || cornerId === 'pangeos_lunch');

  if (isInstantPlaza) {
    wait = Math.min(wait, 18);
  } else if (isPangeosLife) {
    wait = Math.min(wait, 16);
  } else {
    wait = Math.min(wait, 12);
  }

  return wait;
}

/**
 * Input parameters for wait time estimation (for type safety).
 */
export interface WaitTimeInput {
  queueLength: number;
  restaurantId: string;
  cornerId: string;
}

/**
 * Estimates wait time using structured input.
 * Wrapper around computeWaitMinutes for cleaner API.
 * 
 * @param input - Queue length, restaurant ID, and corner ID
 * @returns Estimated wait time in minutes
 */
export function estimateWaitMinutes(input: WaitTimeInput): number {
  return computeWaitMinutes(input.queueLength, input.restaurantId, input.cornerId);
}

/**
 * Get the service rate for a specific corner.
 * Useful for debugging and testing.
 * 
 * @param cornerId - Corner identifier
 * @returns Service rate in people per minute
 */
export function getServiceRate(cornerId: string): number {
  return SERVICE_RATE_PEOPLE_PER_MIN[cornerId] ?? DEFAULT_SERVICE_RATE;
}

/**
 * Get the overhead time for a specific corner.
 * 
 * @param cornerId - Corner identifier
 * @returns Overhead time in minutes
 */
export function getOverhead(cornerId: string): number {
  return OVERHEAD_MIN[cornerId] ?? 0;
}
