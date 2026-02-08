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

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Menu variant for corners with multiple main dishes (e.g., breakfast_1000).
 */
export interface MenuVariantData {
  mainMenuName: string;
  items: string[];
}

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
  variants?: MenuVariantData[];
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
  queueLen: number;
  estWaitTimeMin: number;
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

// ----------------------------------------------------------------------------
// API Interaction Functions
// ----------------------------------------------------------------------------

/**
 * Fetches menu data for a specific date.
 */
export async function getMenus(dayKey: DayKey): Promise<DataResponse<MenuDataMap>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/menu?date=${dayKey}`);
    if (!res.ok) {
      if (res.status === 404 || res.status === 503) {
        return { data: null, hasData: false };
      }
      const errText = await res.text();
      console.error(`[API Error] ${res.status} /api/menu:`, errText);
      throw new Error(`API Error: ${res.statusText} - ${errText}`);
    }
    const data = await res.json();
    return { data, hasData: true };
  } catch (error) {
    console.error('Failed to fetch menus:', error);
    return { data: null, hasData: false, error: 'Failed to load menu data' };
  }
}

/**
 * Fetches available timestamps for waiting data on a specific date.
 */
export async function getAvailableTimestamps(dayKey: DayKey): Promise<DataResponse<string[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/waiting/timestamps?date=${dayKey}`);
    if (!res.ok) {
      // If 503 (DB disabled), we just return empty list
      if (res.status === 503) {
        return { data: [], hasData: false };
      }
      const errText = await res.text();
      console.error(`[API Error] ${res.status} /api/waiting/timestamps:`, errText);
      throw new Error(`API Error: ${res.statusText} - ${errText}`);
    }
    const json = await res.json();
    return { data: json.timestamps || [], hasData: true };
  } catch (error) {
    console.error('Failed to fetch timestamps:', error);
    return { data: [], hasData: false, error: 'Failed to load timestamps' };
  }
}

/**
 * Fetches wait times for a specific date and time.
 * If granularity is '10min', it finds the closest available timestamp.
 */
export async function getWaitTimes(
  dayKey: DayKey,
  time: string,
  _granularity: 'raw' | '5min' | '10min' = '10min' // Granularity logic handled by API for now
): Promise<DataResponse<WaitingDataItem[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/waiting?date=${dayKey}&time=${time}`);
    if (!res.ok) {
      if (res.status === 503) return { data: [], hasData: false };
      const errText = await res.text();
      console.error(`[API Error] ${res.status} /api/waiting:`, errText);
      throw new Error(`API Error: ${res.statusText} - ${errText}`);
    }
    const data = await res.json();
    return { data, hasData: true };
  } catch (error) {
    console.error('Failed to fetch wait times:', error);
    return { data: [], hasData: false, error: 'Failed to load wait times' };
  }
}

/**
 * Fetches the LATEST wait times for today.
 */
export async function getLatestWaitTimes(dayKey: DayKey): Promise<DataResponse<WaitingDataItem[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/waiting/latest?date=${dayKey}`);
    if (!res.ok) {
      if (res.status === 503) return { data: [], hasData: false };
      const errText = await res.text();
      console.error(`[API Error] ${res.status} /api/waiting/latest:`, errText);
      throw new Error(`API Error: ${res.statusText} - ${errText}`);
    }
    const data = await res.json();
    return { data, hasData: true };
  } catch (error) {
    console.error('Failed to fetch latest wait times:', error);
    return { data: [], hasData: false, error: 'Failed to load latest wait times' };
  }
}

export async function getConfig() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/config`);
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[API Error] ${res.status} /api/config:`, errText);
      throw new Error(`Config fetch failed: ${res.status} ${errText}`);
    }
    const data = await res.json();
    return { data, hasData: true };
  } catch (e) {
    console.error(e);
    return { data: null, hasData: false, error: 'Failed to load config' };
  }
}

/**
 * Fetches ALL waiting data for a specific date (for charts).
 */
export async function getAllWaitTimes(dayKey: DayKey): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/waiting/all?date=${dayKey}`);
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[API Error] ${res.status} /api/waiting/all:`, errText);
      return [];
    }
    const json = await res.json();
    return json;
  } catch (error) {
    console.error('Failed to fetch all wait times:', error);
    return [];
  }
}
