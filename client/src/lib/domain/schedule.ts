/**
 * schedule.ts - Schedule Domain Module (Client Re-export)
 * 
 * Purpose: Re-exports schedule functionality from the shared domain module.
 * This maintains backward compatibility for existing client imports.
 * 
 * The actual implementation is in shared/domain/schedule.ts, which is shared
 * between client and server (e.g., simulator script).
 */

// Re-export everything from shared schedule module
export {
  // Types
  type DayKey,
  type ServiceDayType,
  type TimeWindow,
  type CornerSchedule,
  type ScheduleConfig,
  type IsCornerActiveParams,
  type CornerStatus,
  type CornerMenuDataMap,
  
  // Config
  CORNER_SCHEDULES,
  
  // Functions
  isHoliday,
  getServiceDayType,
  isCornerActive,
  getCornerStatuses,
  sortCornersByStatus,
} from '@shared/domain/schedule';
