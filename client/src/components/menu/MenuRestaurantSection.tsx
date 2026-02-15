/**
 * MenuRestaurantSection.tsx - Restaurant Section for Menu Tab
 * 
 * Purpose: Displays a single restaurant with all its menu corners using MenuCornerCard.
 */
import { useMemo } from 'react';
import { MenuCornerCard } from './MenuCornerCard';
import { InfoPopover } from '@/components/InfoPopover';
import type { RestaurantInfo, MenuItem, WaitingData } from '@shared/types';
import type { DayKey } from '@/lib/dateUtils';
import { getCornerStatuses, sortCornersByStatus } from '@/lib/domain/schedule';
import { CORNER_DISPLAY_NAMES } from '@shared/cornerDisplayNames';

interface MenuRestaurantSectionProps {
    restaurant: RestaurantInfo;
    menus: Record<string, MenuItem>;
    waitingData: WaitingData[];
    dayKey: DayKey;
    referenceTime: string | null;
}

export function MenuRestaurantSection({ restaurant, menus, waitingData, dayKey, referenceTime }: MenuRestaurantSectionProps) {
    const waitingMap = new Map(
        waitingData
            .filter((w) => w.restaurantId === restaurant.id)
            .map((w) => [w.cornerId, w])
    );

    const sortedCorners = useMemo(() => {
        const statuses = getCornerStatuses(
            restaurant.id,
            restaurant.cornerOrder,
            dayKey,
            referenceTime,
            menus,
        );
        return sortCornersByStatus(statuses);
    }, [restaurant.id, restaurant.cornerOrder, dayKey, referenceTime, menus]);

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
                        <MenuCornerCard
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
