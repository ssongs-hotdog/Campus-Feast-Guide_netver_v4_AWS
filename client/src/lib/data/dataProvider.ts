/**
 * dataProvider.ts - Data Provider Abstraction Layer
 * 
 * Purpose: Provides a clean API for UI components to fetch data.
 * This abstracts away the data source (currently JSON files, later API).
 * 
 * How to switch to a real API:
 * 1. Replace the fetch calls in this file to point to your real API endpoints
 * 2. Adjust response parsing if the API format differs
 * 3. The rest of the app doesn't need to change!
 * 
 * Key functions:
 * - getMenus(dayKey): Fetches menu data for a specific date
 * - getMenuDetail(dayKey, restaurantId, cornerId): Fetches a single menu item
 * - getWaitTimes(dayKey, time): Fetches wait time data for a specific date/time
 * - getAvailableTimestamps(dayKey): Gets available data points for a date
 */

import type { DayKey } from '../dateUtils';

/**
 * Menu item from the API/data source.
 * Matches the structure in menus_by_date.json
 */
export interface MenuItemData {
  restaurantId: string;
  cornerId: string;
  cornerDisplayName: string;
  mainMenuName: string;
  priceWon: number;
  items: string[];
}

/**
 * Menu data organized by restaurant and corner.
 */
export interface MenuDataMap {
  [restaurantId: string]: {
    [cornerId: string]: MenuItemData;
  };
}

/**
 * Waiting data from the API.
 */
export interface WaitingDataItem {
  timestamp: string;
  restaurantId: string;
  cornerId: string;
  queue_len: number;
  est_wait_time_min: number;
  data_type?: 'observed' | 'predicted';
}

/**
 * Response wrapper that includes data availability flag.
 */
export interface DataResponse<T> {
  data: T | null;
  hasData: boolean;
  error?: string;
}

/**
 * Fetches menu data for a specific date.
 * 
 * @param dayKey - The date in YYYY-MM-DD format
 * @returns Menu data organized by restaurant/corner, or null if no data
 * 
 * Example:
 *   const result = await getMenus('2026-01-15');
 *   if (result.hasData) {
 *     console.log(result.data?.hanyang_plaza?.korean);
 *   }
 */
export async function getMenus(dayKey: DayKey): Promise<DataResponse<MenuDataMap>> {
  try {
    const res = await fetch(`/api/menu?date=${dayKey}`);
    
    if (!res.ok) {
      if (res.status === 404) {
        // No data for this date - this is expected for future dates
        return { data: null, hasData: false };
      }
      throw new Error(`Failed to fetch menu data: ${res.status}`);
    }
    
    const data = await res.json();
    return { data, hasData: true };
  } catch (error) {
    console.error('Error fetching menus:', error);
    return { 
      data: null, 
      hasData: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Fetches a single menu item detail.
 * 
 * @param dayKey - The date
 * @param restaurantId - Restaurant identifier
 * @param cornerId - Corner identifier
 * @returns The menu item or null if not found
 */
export async function getMenuDetail(
  dayKey: DayKey,
  restaurantId: string,
  cornerId: string
): Promise<DataResponse<MenuItemData>> {
  const menusResult = await getMenus(dayKey);
  
  if (!menusResult.hasData || !menusResult.data) {
    return { data: null, hasData: false };
  }
  
  const menuItem = menusResult.data[restaurantId]?.[cornerId];
  
  if (!menuItem) {
    return { data: null, hasData: false };
  }
  
  return { data: menuItem, hasData: true };
}

/**
 * Fetches available timestamps for a specific date.
 * Used to populate the time slider and determine data availability.
 * 
 * @param dayKey - The date
 * @returns Array of ISO timestamp strings
 */
export async function getAvailableTimestamps(
  dayKey: DayKey
): Promise<DataResponse<string[]>> {
  try {
    const res = await fetch(`/api/waiting/timestamps?date=${dayKey}`);
    
    if (!res.ok) {
      return { 
        data: [], 
        hasData: false, 
        error: `Failed to fetch timestamps: ${res.status}` 
      };
    }
    
    const result = await res.json();
    const timestamps = result.timestamps || [];
    
    return { 
      data: timestamps, 
      hasData: timestamps.length > 0 
    };
  } catch (error) {
    console.error('Error fetching timestamps:', error);
    return { 
      data: [], 
      hasData: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Fetches wait time data for a specific date and time.
 * 
 * @param dayKey - The date
 * @param time - Either an ISO timestamp (for realtime) or HH:MM (for historical)
 * @param aggregate - Whether to aggregate data (e.g., '5min')
 * @returns Array of waiting data items
 */
export async function getWaitTimes(
  dayKey: DayKey,
  time?: string,
  aggregate?: '5min'
): Promise<DataResponse<WaitingDataItem[]>> {
  try {
    let url = `/api/waiting?date=${dayKey}`;
    
    if (time) {
      url += `&time=${encodeURIComponent(time)}`;
    }
    
    if (aggregate) {
      url += `&aggregate=${aggregate}`;
    }
    
    const res = await fetch(url);
    
    if (!res.ok) {
      return { 
        data: [], 
        hasData: false, 
        error: `Failed to fetch wait times: ${res.status}` 
      };
    }
    
    const data = await res.json();
    
    return { 
      data, 
      hasData: Array.isArray(data) && data.length > 0 
    };
  } catch (error) {
    console.error('Error fetching wait times:', error);
    return { 
      data: [], 
      hasData: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Fetches all wait time data for a specific date (unfiltered).
 * Used by ChartsPanel for displaying historical trends.
 * 
 * @param dayKey - The date
 * @returns Array of all waiting data items for the date
 */
export async function getAllWaitTimes(
  dayKey: DayKey
): Promise<DataResponse<WaitingDataItem[]>> {
  try {
    const res = await fetch(`/api/waiting/all?date=${dayKey}`);
    
    if (!res.ok) {
      return { 
        data: [], 
        hasData: false, 
        error: `Failed to fetch all wait times: ${res.status}` 
      };
    }
    
    const data = await res.json();
    
    return { 
      data, 
      hasData: Array.isArray(data) && data.length > 0 
    };
  } catch (error) {
    console.error('Error fetching all wait times:', error);
    return { 
      data: [], 
      hasData: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Checks if data exists for a given date.
 * Useful for showing "no data" states without loading full data.
 * 
 * @param dayKey - The date to check
 * @returns true if any data exists for this date
 */
export async function hasDataForDate(dayKey: DayKey): Promise<boolean> {
  const [menuResult, timestampResult] = await Promise.all([
    getMenus(dayKey),
    getAvailableTimestamps(dayKey),
  ]);
  
  return menuResult.hasData || timestampResult.hasData;
}
