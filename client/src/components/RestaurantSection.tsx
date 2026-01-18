/**
 * RestaurantSection.tsx - Restaurant Section Component
 * 
 * Purpose: Displays a single restaurant with all its menu corners.
 * Each corner is rendered as a CornerCard with its menu and waiting data.
 * 
 * Key behavior:
 * - ALWAYS renders one card per corner (even when no data exists)
 * - When menu data is missing, CornerCard shows placeholder text
 * - When waiting data is missing, CornerCard shows "-" and "미제공"
 * 
 * Props:
 * - restaurant: Restaurant information (name, location, hours)
 * - menus: Menu items keyed by corner ID (may be empty)
 * - waitingData: Array of waiting data for all corners (may be empty)
 * - dayKey: The current date being viewed
 */
import { CornerCard } from './CornerCard';
import { InfoPopover } from './InfoPopover';
import type { RestaurantInfo, MenuItem, WaitingData } from '@shared/types';
import type { DayKey } from '@/lib/dateUtils';

// Corner display names for placeholder cards when menu data is missing
// These match the schedule-based corner names from the spec
const CORNER_DISPLAY_NAMES: Record<string, string> = {
  // 한양플라자 corners
  breakfast_1000: '천원의 아침밥',
  western: '양식',
  korean: '한식',
  instant: '즉석',
  cupbap: '오늘의 컵밥',
  ramen: '라면',
  // 신소재공학관 corners
  set_meal: '정식',
  single_dish: '일품',
  rice_bowl: '덮밥',
  dinner: '석식',
  // 생활과학관 corners
  dam_a_lunch: '중식 Dam-A',
  pangeos_lunch: '중식 Pangeos',
  dam_a_dinner: '석식 Dam-A',
};

interface RestaurantSectionProps {
  restaurant: RestaurantInfo;
  menus: Record<string, MenuItem>;
  waitingData: WaitingData[];
  dayKey: DayKey;
}

export function RestaurantSection({ restaurant, menus, waitingData, dayKey }: RestaurantSectionProps) {
  const waitingMap = new Map(
    waitingData
      .filter((w) => w.restaurantId === restaurant.id)
      .map((w) => [w.cornerId, w])
  );

  return (
    <section className="mb-6" data-testid={`section-restaurant-${restaurant.id}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-bold text-foreground">{restaurant.name}</h2>
        <div className="flex gap-1">
          <InfoPopover
            type="location"
            title={restaurant.name}
            content={restaurant.location}
          />
          <InfoPopover
            type="hours"
            title={restaurant.name}
            content={restaurant.hours}
          />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {restaurant.cornerOrder.map((cornerId) => {
          const menu = menus[cornerId];
          const cornerDisplayName = menu?.cornerDisplayName || CORNER_DISPLAY_NAMES[cornerId] || cornerId;
          
          return (
            <CornerCard
              key={cornerId}
              menu={menu || null}
              waitingData={waitingMap.get(cornerId)}
              dayKey={dayKey}
              restaurantId={restaurant.id}
              cornerId={cornerId}
              cornerDisplayName={cornerDisplayName}
            />
          );
        })}
      </div>
    </section>
  );
}
