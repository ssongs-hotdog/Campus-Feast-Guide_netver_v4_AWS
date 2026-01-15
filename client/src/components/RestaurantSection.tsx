import { CornerCard } from './CornerCard';
import { InfoPopover } from './InfoPopover';
import type { RestaurantInfo, MenuItem, WaitingData } from '@shared/types';

interface RestaurantSectionProps {
  restaurant: RestaurantInfo;
  menus: Record<string, MenuItem>;
  waitingData: WaitingData[];
}

export function RestaurantSection({ restaurant, menus, waitingData }: RestaurantSectionProps) {
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
          if (!menu) return null;
          return (
            <CornerCard
              key={cornerId}
              menu={menu}
              waitingData={waitingMap.get(cornerId)}
            />
          );
        })}
      </div>
    </section>
  );
}
