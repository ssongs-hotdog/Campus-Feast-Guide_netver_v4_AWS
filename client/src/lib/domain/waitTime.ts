/**
 * waitTime.ts - Client-side Wait Time Domain Logic
 * 
 * This module re-exports the canonical wait time calculation from shared/domain.
 * All wait time logic is centralized there for consistency between client and server.
 * 
 * NOTE: In most cases, the client receives pre-computed est_wait_time_min from the API.
 * This module is available for client-side calculations if needed (e.g., simulations).
 * 
 * getCongestionLevel is exported from @shared/types (the canonical location).
 */

import { 
  computeWaitMinutes as sharedComputeWaitMinutes,
  type WaitTimeInput,
} from '@shared/domain/waitTime';

import { getCongestionLevel, type CongestionLevel } from '@shared/types';

export { sharedComputeWaitMinutes as computeWaitMinutes };
export { type WaitTimeInput };
export { getCongestionLevel };

/**
 * Output of wait time estimation with congestion level.
 */
export interface WaitTimeOutput {
  estimatedWaitMinutes: number;
  congestionLevel: CongestionLevel;
}

/**
 * Estimates wait time and returns congestion level.
 * Combines computeWaitMinutes with getCongestionLevel.
 * 
 * @param input - Queue length, restaurant ID, and corner ID
 * @returns Estimated wait time in minutes and congestion level
 */
export function estimateWaitTime(input: WaitTimeInput): WaitTimeOutput {
  const estimatedWaitMinutes = sharedComputeWaitMinutes(
    input.queueLength, 
    input.restaurantId, 
    input.cornerId
  );
  const congestionLevel = getCongestionLevel(estimatedWaitMinutes);
  
  return {
    estimatedWaitMinutes,
    congestionLevel,
  };
}
