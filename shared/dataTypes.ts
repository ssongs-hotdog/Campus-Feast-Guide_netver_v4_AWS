/**
 * dataTypes.ts - Shared Data Types
 * 
 * Purpose: Single source of truth for all data shapes used in the HY-eat application.
 * These types are shared between the data provider layer and UI components.
 * 
 * The types here define the "contract" between:
 * - Data ingestion (loading from JSON files or API)
 * - Domain logic (computing wait times)
 * - UI presentation (displaying data)
 */

import type { DayKey } from '../client/src/lib/dateUtils';

/**
 * Restaurant information - the fixed "skeleton" of the app.
 * Restaurant names, locations, and corner ordering are stable and don't change.
 */
export interface Restaurant {
  id: string;
  name: string;
  location: string;
  hours: string;
  cornerOrder: string[];  // Order in which corners should be displayed
}

/**
 * Corner (food station) within a restaurant.
 * Each restaurant has multiple corners serving different types of food.
 */
export interface Corner {
  id: string;
  displayName: string;
}

/**
 * Menu variant for corners that offer multiple main dishes (e.g., breakfast_1000).
 */
export interface MenuVariant {
  mainMenuName: string;
  items: string[];
}

/**
 * Menu item served at a specific corner.
 * This is the main menu for a day at a particular corner.
 */
export interface MenuItem {
  restaurantId: string;
  cornerId: string;
  cornerDisplayName: string;
  mainMenuName: string;
  priceWon: number;
  items: string[];  // Side dishes or additional items
  variants?: MenuVariant[];  // Optional: for corners with multiple main menus (breakfast_1000)
}

/**
 * Detailed menu information for the detail page.
 * Extends MenuItem with additional information if available.
 */
export interface MenuDetail extends MenuItem {
  // Future: could include nutrition info, allergens, etc.
}

/**
 * Queue snapshot - current queue length at a corner at a specific time.
 * This is the raw data from sensors/observations.
 */
export interface QueueSnapshot {
  timestamp: string;  // ISO 8601 format
  restaurantId: string;
  cornerId: string;
  queueLength: number;
  dataType: 'observed' | 'predicted';  // Whether this is real-time or predicted
}

/**
 * Wait time result - computed estimated wait time.
 * This is the output of the domain logic layer.
 */
export interface WaitTimeResult {
  restaurantId: string;
  cornerId: string;
  queueLength: number;
  estimatedWaitMinutes: number;
  congestionLevel: CongestionLevel;
  timestamp: string;
  dataType: 'observed' | 'predicted';
}

/**
 * Congestion level from 1 (least crowded) to 5 (most crowded).
 */
export type CongestionLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Menu data structure organized by restaurant and corner.
 * This is how menu data is returned from the data provider.
 */
export interface MenuDataByRestaurant {
  [restaurantId: string]: {
    [cornerId: string]: MenuItem;
  };
}

/**
 * Response structure for menu data fetch.
 * Includes both the data and metadata about availability.
 */
export interface MenuDataResponse {
  data: MenuDataByRestaurant | null;
  hasData: boolean;
  dayKey: DayKey;
}

/**
 * Response structure for wait time data fetch.
 */
export interface WaitTimeDataResponse {
  data: WaitTimeResult[];
  hasData: boolean;
  dayKey: DayKey;
  timestamp: string | null;
}

/**
 * Labels for congestion levels in Korean.
 */
export const CONGESTION_LABELS: Record<CongestionLevel, string> = {
  1: '매우여유',
  2: '여유',
  3: '보통',
  4: '혼잡',
  5: '매우혼잡',
};

/**
 * Colors for congestion levels (for visual indicators).
 */
export const CONGESTION_COLORS: Record<CongestionLevel, string> = {
  1: '#10B981',  // Green - very low
  2: '#84CC16',  // Light green - low
  3: '#EAB308',  // Yellow - moderate
  4: '#F97316',  // Orange - high
  5: '#EF4444',  // Red - very high
};
