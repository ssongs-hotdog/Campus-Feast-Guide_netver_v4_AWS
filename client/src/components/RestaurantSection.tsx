/**
 * RestaurantSection.tsx - Restaurant Section Component
 * 
 * Purpose: Displays a single restaurant with all its menu corners.
 * Each corner is rendered as a CornerCard with its menu and waiting data.
 * 
 * Key behavior:
 * - ALWAYS renders one card per corner (even when no data exists)
 * - Corners are sorted: active corners appear first, then inactive
 * - Active status is determined by the schedule (operating hours and breaks)
 * - When menu data is missing, CornerCard shows placeholder text
 * - When waiting data is missing, CornerCard shows "-" and "미제공"
 * 
 * Props:
 * - restaurant: Restaurant information (name, location, hours)
 * - menus: Menu items keyed by corner ID (may be empty)
 * - waitingData: Array of waiting data for all corners (may be empty)
 * - dayKey: The current date being viewed
 * - referenceTime: Time in "HH:MM" format used to determine active/inactive status
 */
import { useMemo } from 'react';
import { CornerCard } from './CornerCard';
import { InfoPopover } from './InfoPopover';
import type { RestaurantInfo, MenuItem, WaitingData } from '@shared/types';
import type { DayKey } from '@/lib/dateUtils';
import { getCornerStatuses, sortCornersByStatus } from '@/lib/domain/schedule';
import { CORNER_DISPLAY_NAMES } from '@shared/cornerDisplayNames';

interface RestaurantSectionProps {
  restaurant: RestaurantInfo;
  menus: Record<string, MenuItem>;
  waitingData: WaitingData[];
  dayKey: DayKey;
  referenceTime: string;  // "HH:MM" format
}

export function RestaurantSection({ restaurant, menus, waitingData, dayKey, referenceTime }: RestaurantSectionProps) {
  const waitingMap = new Map(
    waitingData
      .filter((w) => w.restaurantId === restaurant.id)
      .map((w) => [w.cornerId, w])
  );

  // Compute active status for all corners and sort (active first)
  const sortedCorners = useMemo(() => {
    const statuses = getCornerStatuses(
      restaurant.id,
      restaurant.cornerOrder,
      dayKey,
      referenceTime,
    );
    return sortCornersByStatus(statuses);
  }, [restaurant.id, restaurant.cornerOrder, dayKey, referenceTime]);

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
        {sortedCorners.map(({ cornerId, isActive }) => {
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
              isActive={isActive}
            />
          );
        })}
      </div>
    </section>
  );
}
