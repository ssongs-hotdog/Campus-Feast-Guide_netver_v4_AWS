/**
 * server/waitModel.ts - Server-side Wait Time Calculation
 * 
 * This is a thin re-export of the shared wait time module.
 * All logic lives in shared/domain/waitTime.ts for consistency.
 */

export { 
  computeWaitMinutes,
  estimateWaitMinutes,
  getServiceRate,
  getOverhead,
  type WaitTimeInput,
} from '../shared/domain/waitTime';
