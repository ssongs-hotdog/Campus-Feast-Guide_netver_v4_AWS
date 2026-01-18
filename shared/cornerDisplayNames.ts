/**
 * cornerDisplayNames.ts - Corner Display Name Mapping
 * 
 * IMPORTANT: This is the SINGLE SOURCE OF TRUTH for corner display names.
 * 
 * Key concepts:
 * - cornerId: Stable internal identifier (e.g., 'western', 'korean')
 *   → These MUST stay stable forever. They are used as keys in:
 *     - RESTAURANTS[].cornerOrder (shared/types.ts)
 *     - CORNER_SCHEDULES (client/src/lib/domain/schedule.ts)
 *     - Menu data JSON (data/menus_by_date.json)
 * 
 * - cornerDisplayName: User-facing Korean name (e.g., '양식', '한식')
 *   → These CAN change without breaking data matching.
 * 
 * To add a new corner:
 * 1. Add cornerId to RESTAURANTS[].cornerOrder in shared/types.ts
 * 2. Add schedule config in client/src/lib/domain/schedule.ts
 * 3. Add display name mapping here
 * 4. Add menu data to data/menus_by_date.json using the same cornerId
 */

/**
 * Maps cornerId (stable key) to Korean display name.
 * 
 * The display name is used in the UI when menu data doesn't provide one.
 * Menu data can override this with its own cornerDisplayName field.
 */
export const CORNER_DISPLAY_NAMES: Record<string, string> = {
  // 한양플라자 (hanyang_plaza) corners
  breakfast_1000: '천원의 아침밥',
  western: '양식',
  korean: '한식',
  instant: '즉석',
  cupbap: '오늘의 컵밥',
  ramen: '라면',
  
  // 신소재공학관 (materials) corners
  set_meal: '정식',
  single_dish: '일품',
  rice_bowl: '덮밥',
  dinner: '석식',
  
  // 생활과학관 (life_science) corners
  dam_a_lunch: '중식 Dam-A',
  pangeos_lunch: '중식 Pangeos',
  dam_a_dinner: '석식 Dam-A',
};

/**
 * Get display name for a corner, with fallback to cornerId itself.
 */
export function getCornerDisplayName(cornerId: string): string {
  return CORNER_DISPLAY_NAMES[cornerId] || cornerId;
}
