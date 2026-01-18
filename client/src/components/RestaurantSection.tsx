/**
 * RestaurantSection.tsx - Restaurant Section Component
 * 
 * Purpose: Displays a single restaurant with all its menu corners.
 * Each corner is rendered as a CornerCard with its menu and waiting data.
 * 
 * Props:
 * - restaurant: Restaurant information (name, location, hours)
 * - menus: Menu items keyed by corner ID
 * - waitingData: Array of waiting data for all corners
 * - dayKey: The current date being viewed
 */
import { CornerCard } from './CornerCard';
import { InfoPopover } from './InfoPopover';
import type { RestaurantInfo, MenuItem, WaitingData } from '@shared/types';
import type { DayKey } from '@/lib/dateUtils';

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

  const hasAnyMenus = restaurant.cornerOrder.some(cornerId => menus[cornerId]);

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
        {hasAnyMenus ? (
          restaurant.cornerOrder.map((cornerId) => {
            const menu = menus[cornerId];
            if (!menu) return null;
            return (
              <CornerCard
                key={cornerId}
                menu={menu}
                waitingData={waitingMap.get(cornerId)}
                dayKey={dayKey}
              />
            );
          })
        ) : (
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              메뉴 데이터가 없습니다
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
