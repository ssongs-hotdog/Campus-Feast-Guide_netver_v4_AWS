/**
 * dateUtils.ts - Date Utility Module
 * 
 * Purpose: Provides real date-based navigation utilities for the HY-eat app.
 * All date operations use the user's local timezone (typically Asia/Seoul).
 * 
 * Key exports:
 * - getTodayKey(): Returns today's date as YYYY-MM-DD
 * - addDays(dayKey, delta): Adds/subtracts days from a date key
 * - parseDayKeyFromUrl(): Extracts date from URL path
 * - formatDayKey(dayKey): Formats a date key for display in Korean
 */

/**
 * DayKey type alias for date strings in YYYY-MM-DD format.
 * This format is URL-safe and sortable.
 */
export type DayKey = string; // Format: YYYY-MM-DD

/**
 * Gets the current date as a DayKey (YYYY-MM-DD format).
 * Uses browser local time.
 * 
 * @returns The current date as YYYY-MM-DD string
 */
export function getTodayKey(): DayKey {
  const now = new Date();
  return formatDateToKey(now);
}

/**
 * Converts a Date object to a DayKey string.
 * 
 * @param date - The Date object to convert
 * @returns The date as YYYY-MM-DD string
 */
export function formatDateToKey(date: Date): DayKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds (or subtracts) days from a DayKey.
 * 
 * @param dayKey - The starting date in YYYY-MM-DD format
 * @param delta - Number of days to add (negative to subtract)
 * @returns New DayKey after adding delta days, or today if invalid input
 * 
 * Example:
 *   addDays('2026-01-15', 1)  → '2026-01-16'
 *   addDays('2026-01-15', -1) → '2026-01-14'
 *   addDays('', 1)            → today + 1 (fallback)
 */
export function addDays(dayKey: DayKey, delta: number): DayKey {
  // Guard against invalid input - fall back to today
  if (!dayKey || !isValidDayKey(dayKey)) {
    const today = getTodayKey();
    const date = parseDayKeyToDate(today);
    date.setDate(date.getDate() + delta);
    return formatDateToKey(date);
  }
  const date = parseDayKeyToDate(dayKey);
  date.setDate(date.getDate() + delta);
  return formatDateToKey(date);
}

/**
 * Parses a DayKey string to a Date object (at noon to avoid timezone issues).
 * 
 * @param dayKey - Date string in YYYY-MM-DD format
 * @returns Date object set to noon on that day
 */
export function parseDayKeyToDate(dayKey: DayKey): Date {
  // Parse at noon to avoid timezone edge cases
  return new Date(dayKey + 'T12:00:00');
}

/**
 * Extracts the DayKey from a URL path.
 * Expected path format: /d/YYYY-MM-DD or /d/YYYY-MM-DD/...
 * 
 * @param pathname - The URL pathname to parse
 * @returns The DayKey if found, or null if not in expected format
 * 
 * Example:
 *   parseDayKeyFromPath('/d/2026-01-15')        → '2026-01-15'
 *   parseDayKeyFromPath('/d/2026-01-15/menu/1') → '2026-01-15'
 *   parseDayKeyFromPath('/other')               → null
 */
export function parseDayKeyFromPath(pathname: string): DayKey | null {
  // Match /d/YYYY-MM-DD pattern at the start of the path
  const match = pathname.match(/^\/d\/(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return match[1];
  }
  return null;
}

/**
 * Validates if a string is a valid DayKey format.
 * 
 * @param str - String to validate
 * @returns true if the string matches YYYY-MM-DD format
 */
export function isValidDayKey(str: string): boolean {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(str)) return false;

  // Also check if it's a valid date
  const date = new Date(str + 'T12:00:00');
  return !isNaN(date.getTime());
}

/**
 * Formats a DayKey for display in Korean.
 * 
 * @param dayKey - Date in YYYY-MM-DD format
 * @param todayKey - Today's date for relative labeling (optional)
 * @returns Formatted string like "1월 15일 (수)"
 */
export function formatDayKeyForDisplay(dayKey: DayKey, todayKey?: DayKey): string {
  const date = parseDayKeyToDate(dayKey);

  // If today is provided, we could add relative labels like "오늘", "어제", "내일"
  // but for now we just format the date
  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

/**
 * Gets a relative label for a date compared to today.
 * 
 * @param dayKey - The date to check
 * @param todayKey - Today's date
 * @returns Label like "오늘", "어제", "내일", or the formatted date
 */
export function getRelativeLabel(dayKey: DayKey, todayKey: DayKey): string {
  if (dayKey === todayKey) return '오늘';
  if (dayKey === addDays(todayKey, -1)) return '어제';
  if (dayKey === addDays(todayKey, 1)) return '내일';
  return formatDayKeyForDisplay(dayKey);
}

/**
 * Compares two DayKeys.
 * 
 * @returns negative if a < b, positive if a > b, 0 if equal
 */

/**
 * Returns the appropriate text to display when menu data is missing.
 * 
 * Rules:
 * - Today & Past: "휴무입니다"
 * - Future: "식단 정보가 등록되지 않았습니다."
 * 
 * @param dayKey - The date of the menu being viewed
 * @returns The localized status text
 */
export function getMissingMenuText(dayKey: DayKey): string {
  const today = getTodayKey();

  // simple string comparison works for YYYY-MM-DD
  if (dayKey > today) {
    return "식단 정보가 등록되지 않았습니다.";
  }

  return "휴무입니다";
}
