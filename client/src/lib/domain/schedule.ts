/**
 * schedule.ts - Schedule Domain Module
 * 
 * Purpose: Contains all schedule-related logic for determining when cafeteria
 * corners are active or inactive. This keeps schedule logic out of UI components.
 * 
 * Key concepts:
 * - ServiceDayType: WEEKDAY (Mon-Fri), SATURDAY, SUNDAY, or HOLIDAY
 * - TimeWindow: A period when a corner operates (e.g., 11:00-14:30)
 * - BreakWindow: A period within operating hours when corner is closed
 * - isActive: True if reference time is within operating window AND not in break
 * 
 * To add new corners or schedules:
 * 1. Add corner ID to CORNER_SCHEDULES under the appropriate restaurant
 * 2. Define weekday/saturday time windows and any break windows
 */

import type { DayKey } from '@/lib/dateUtils';

// ============================================================================
// Types
// ============================================================================

/** Day type determines which schedule to use */
export type ServiceDayType = 'WEEKDAY' | 'SATURDAY' | 'SUNDAY' | 'HOLIDAY';

/** Time window in HH:MM format */
export interface TimeWindow {
  start: string;  // "HH:MM"
  end: string;    // "HH:MM"
}

/** Schedule for a single corner */
export interface CornerSchedule {
  weekday?: TimeWindow[];      // Mon-Fri operating windows
  saturday?: TimeWindow[];     // Saturday operating windows
  sunday?: TimeWindow[];       // Sunday operating windows (usually empty/closed)
  breakWindows?: {             // Break times within operating hours
    weekday?: TimeWindow[];
    saturday?: TimeWindow[];
  };
  /**
   * If true, this corner requires menu data to be considered active.
   * When set:
   * - Active = schedule-based active AND menu data exists for this corner
   * - If menu data is missing, the corner is INACTIVE (gray) even during operating hours
   * 
   * Use case: Corners that operate irregularly and use menu data presence as the "open today" signal.
   * Default: false (schedule-only active status)
   */
  requiresMenuDataForActive?: boolean;
}

/** All schedules keyed by restaurantId, then cornerId */
export type ScheduleConfig = Record<string, Record<string, CornerSchedule>>;

// ============================================================================
// Schedule Configuration
// ============================================================================

/**
 * Operating schedules for all corners.
 * 
 * Each corner has time windows for weekday and/or saturday.
 * Sunday and Korean public holidays are closed unless explicitly specified.
 */
export const CORNER_SCHEDULES: ScheduleConfig = {
  hanyang_plaza: {
    breakfast_1000: {
      weekday: [{ start: '08:20', end: '10:20' }],
      // No saturday/sunday - closed
    },
    western: {
      weekday: [{ start: '11:00', end: '14:30' }],
      saturday: [{ start: '10:00', end: '14:00' }],
    },
    korean: {
      weekday: [{ start: '11:00', end: '14:30' }],
      // No saturday - closed
    },
    instant: {
      weekday: [{ start: '11:00', end: '14:30' }],
      // No saturday - closed
    },
    cupbap: {
      weekday: [{ start: '16:00', end: '18:00' }],
      // No saturday - closed
    },
    ramen: {
      weekday: [{ start: '12:00', end: '18:00' }],
      saturday: [{ start: '10:00', end: '18:00' }],
      breakWindows: {
        weekday: [{ start: '14:30', end: '15:30' }],
        // No break on saturday
      },
    },
  },
  materials: {
    set_meal: {
      weekday: [{ start: '11:30', end: '13:30' }],
      saturday: [{ start: '11:30', end: '13:30' }],
    },
    single_dish: {
      weekday: [{ start: '11:30', end: '13:30' }],
      // No saturday - closed
    },
    rice_bowl: {
      weekday: [{ start: '11:30', end: '13:30' }],
      // No saturday - closed
      // This corner operates irregularly - menu data presence signals "open today"
      requiresMenuDataForActive: true,
    },
    dinner: {
      weekday: [{ start: '17:00', end: '18:30' }],
      // No saturday - closed
    },
  },
  life_science: {
    dam_a_lunch: {
      weekday: [{ start: '11:30', end: '14:00' }],
      saturday: [{ start: '11:30', end: '13:30' }],
    },
    pangeos_lunch: {
      weekday: [{ start: '11:30', end: '14:00' }],
      // No saturday - closed
    },
    dam_a_dinner: {
      weekday: [{ start: '17:00', end: '18:30' }],
      // No saturday - closed
    },
  },
};

// ============================================================================
// Holiday Detection (Stub)
// ============================================================================

/**
 * Check if a date is a Korean public holiday.
 * 
 * Currently a stub that returns false. Replace with actual holiday logic
 * when a holiday library is available or when holiday data is added.
 * 
 * @param dateKey - Date in YYYY-MM-DD format
 * @returns true if the date is a Korean public holiday
 */
export function isHoliday(dateKey: DayKey): boolean {
  // TODO: Integrate Korean public holiday calendar
  // Options:
  // 1. Use a holiday library like 'date-holidays'
  // 2. Maintain a static list of holidays
  // 3. Fetch from an API
  return false;
}

// ============================================================================
// Day Type Detection
// ============================================================================

/**
 * Determine what type of service day a date is.
 * 
 * @param dateKey - Date in YYYY-MM-DD format
 * @returns The service day type
 */
export function getServiceDayType(dateKey: DayKey): ServiceDayType {
  // Check holiday first (takes priority)
  if (isHoliday(dateKey)) {
    return 'HOLIDAY';
  }

  // Parse date and get day of week (0 = Sunday, 6 = Saturday)
  const date = new Date(dateKey + 'T12:00:00');
  const dayOfWeek = date.getDay();

  if (dayOfWeek === 0) return 'SUNDAY';
  if (dayOfWeek === 6) return 'SATURDAY';
  return 'WEEKDAY';
}

// ============================================================================
// Time Comparison Utilities
// ============================================================================

/**
 * Convert HH:MM string to minutes since midnight for easy comparison.
 */
function timeToMinutes(timeHHMM: string): number {
  const [hours, minutes] = timeHHMM.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if a time is within a time window (inclusive start, exclusive end).
 */
function isTimeInWindow(timeHHMM: string, window: TimeWindow): boolean {
  const time = timeToMinutes(timeHHMM);
  const start = timeToMinutes(window.start);
  const end = timeToMinutes(window.end);
  return time >= start && time < end;
}

/**
 * Check if a time is within any of the given time windows.
 */
function isTimeInAnyWindow(timeHHMM: string, windows: TimeWindow[]): boolean {
  return windows.some(window => isTimeInWindow(timeHHMM, window));
}

// ============================================================================
// Core Active Status Logic
// ============================================================================

export interface IsCornerActiveParams {
  restaurantId: string;
  cornerId: string;
  dateKey: DayKey;
  timeHHMM: string;  // Reference time in "HH:MM" format
}

/**
 * Determine if a corner is currently active (operating).
 * 
 * A corner is ACTIVE (green dot) if:
 * 1. The day is not Sunday or Holiday (unless explicitly scheduled)
 * 2. The reference time is within an operating window for the day type
 * 3. The reference time is NOT within a break window
 * 
 * @returns true if corner is active, false if inactive (gray)
 */
export function isCornerActive({
  restaurantId,
  cornerId,
  dateKey,
  timeHHMM,
}: IsCornerActiveParams): boolean {
  // Get the schedule for this corner
  const restaurantSchedules = CORNER_SCHEDULES[restaurantId];
  if (!restaurantSchedules) return false;

  const schedule = restaurantSchedules[cornerId];
  if (!schedule) return false;

  // Determine day type
  const dayType = getServiceDayType(dateKey);

  // Sunday and holidays are closed unless explicitly scheduled
  if (dayType === 'SUNDAY' || dayType === 'HOLIDAY') {
    // Check if there's an explicit sunday schedule
    if (schedule.sunday && schedule.sunday.length > 0) {
      return isTimeInAnyWindow(timeHHMM, schedule.sunday);
    }
    return false;
  }

  // Get operating windows for this day type
  let operatingWindows: TimeWindow[] = [];
  let breakWindowsForDay: TimeWindow[] = [];

  if (dayType === 'WEEKDAY') {
    operatingWindows = schedule.weekday || [];
    breakWindowsForDay = schedule.breakWindows?.weekday || [];
  } else if (dayType === 'SATURDAY') {
    operatingWindows = schedule.saturday || [];
    breakWindowsForDay = schedule.breakWindows?.saturday || [];
  }

  // No operating hours for this day = inactive
  if (operatingWindows.length === 0) {
    return false;
  }

  // Check if within operating hours
  if (!isTimeInAnyWindow(timeHHMM, operatingWindows)) {
    return false;
  }

  // Check if within break time
  if (breakWindowsForDay.length > 0 && isTimeInAnyWindow(timeHHMM, breakWindowsForDay)) {
    return false;
  }

  return true;
}

// ============================================================================
// Bulk Status Computation
// ============================================================================

export interface CornerStatus {
  cornerId: string;
  isActive: boolean;
}

/** Menu data map keyed by cornerId for a single restaurant */
export type CornerMenuDataMap = Record<string, unknown>;

/**
 * Get active status for all corners in a restaurant.
 * 
 * @param restaurantId - The restaurant ID
 * @param cornerOrder - Array of corner IDs in display order
 * @param dateKey - Date to check
 * @param timeHHMM - Reference time
 * @param menuData - Optional menu data for this restaurant (keyed by cornerId)
 *                   Used for corners with requiresMenuDataForActive flag
 * @returns Array of corner statuses
 */
export function getCornerStatuses(
  restaurantId: string,
  cornerOrder: string[],
  dateKey: DayKey,
  timeHHMM: string,
  menuData?: CornerMenuDataMap,
): CornerStatus[] {
  return cornerOrder.map(cornerId => {
    // Get schedule-based active status
    const baseIsActive = isCornerActive({ restaurantId, cornerId, dateKey, timeHHMM });
    
    // Check if this corner requires menu data to be active
    const schedule = CORNER_SCHEDULES[restaurantId]?.[cornerId];
    const requiresMenuData = schedule?.requiresMenuDataForActive ?? false;
    
    // Apply the menu data rule if required
    let finalIsActive = baseIsActive;
    if (requiresMenuData) {
      const hasMenuData = menuData?.[cornerId] != null;
      finalIsActive = baseIsActive && hasMenuData;
    }
    
    return {
      cornerId,
      isActive: finalIsActive,
    };
  });
}

/**
 * Sort corners so active ones appear first, maintaining original order within each group.
 * 
 * @param statuses - Array of corner statuses
 * @returns Sorted array with active corners first
 */
export function sortCornersByStatus(statuses: CornerStatus[]): CornerStatus[] {
  const active = statuses.filter(s => s.isActive);
  const inactive = statuses.filter(s => !s.isActive);
  return [...active, ...inactive];
}
