/**
 * MenuRestaurantSection.tsx - Restaurant Section for Menu Tab
 * 
 * Purpose: Displays a single restaurant with all its menu corners using MenuCornerCard.
 * Grouped by Breakfast / Lunch / Dinner based on operating hours.
 */
import { useMemo } from 'react';
import { MenuCornerCard } from './MenuCornerCard';
import { InfoPopover } from '@/components/InfoPopover';
import type { RestaurantInfo, MenuItem } from '@shared/types';
import type { DayKey } from '@/lib/dateUtils';
import { getCornerStatuses, sortCornersByStatus, CORNER_SCHEDULES, getServiceDayType, type CornerStatus } from '@/lib/domain/schedule';
import { CORNER_DISPLAY_NAMES } from '@shared/cornerDisplayNames';

interface MenuRestaurantSectionProps {
    restaurant: RestaurantInfo;
    menus: Record<string, MenuItem>;
    dayKey: DayKey;
    referenceTime: string | null;
}

type TimeGroup = 'breakfast' | 'lunch' | 'dinner';

/**
 * Determines the time category for a corner based on its schedule.
 * Logic:
 * - Breakfast: Opens before 10:00
 * - Lunch: Opens betwen 10:00 and 15:00
 * - Dinner: Opens after 15:00
 */
function getCornerCategory(restaurantId: string, cornerId: string, dayKey: DayKey): TimeGroup {
    const dayType = getServiceDayType(dayKey);
    const schedule = CORNER_SCHEDULES[restaurantId]?.[cornerId];

    if (!schedule) return 'lunch'; // default fallback for unknown corners

    // Get time windows for the specific day type
    let windows = [];
    if (dayType === 'SATURDAY') windows = schedule.saturday || [];
    else if (dayType === 'SUNDAY' || dayType === 'HOLIDAY') windows = schedule.sunday || [];
    else windows = schedule.weekday || [];

    // Fallback: If no schedule for today (e.g. corner closed on Sunday),
    // use 'weekday' schedule to categorize "what kind of corner it refers to".
    // This allows closed corners to appear in their logical section (e.g. "Breakfast (Closed)")
    // instead of being hidden or bunched together randomly.
    if (windows.length === 0) {
        windows = schedule.weekday || [];
    }

    if (windows.length === 0) return 'lunch'; // strict fallback if no schedule exists at all

    const startTime = windows[0].start; // "HH:MM"
    const [h] = startTime.split(':').map(Number);

    if (h < 10) return 'breakfast';
    if (h >= 15) return 'dinner';
    return 'lunch';
}

export function MenuRestaurantSection({ restaurant, menus, dayKey, referenceTime }: MenuRestaurantSectionProps) {
    // 1. Get status for all corners (active/inactive)
    const sortedCorners = useMemo(() => {
        const statuses = getCornerStatuses(
            restaurant.id,
            restaurant.cornerOrder,
            dayKey,
            referenceTime,
            menus,
        );
        // We sort by status first to ensure active items are generally prioritized,
        // but within each group (breakfast/lunch/dinner), we might want to respect this sort or cornerOrder.
        // sortCornersByStatus puts active first.
        return sortCornersByStatus(statuses);
    }, [restaurant.id, restaurant.cornerOrder, dayKey, referenceTime, menus]);

    // 2. Group corners by time category
    const groupedCorners = useMemo(() => {
        const groups: Record<TimeGroup, CornerStatus[]> = {
            breakfast: [],
            lunch: [],
            dinner: []
        };

        sortedCorners.forEach(status => {
            const category = getCornerCategory(restaurant.id, status.cornerId, dayKey);
            groups[category].push(status);
        });

        return groups;
    }, [sortedCorners, restaurant.id, dayKey]);

    // Helper to render a list of corners
    const renderCornerList = (corners: CornerStatus[]) => (
        <div className="flex flex-col gap-3">
            {corners.map(({ cornerId, isActive }) => {
                const menu = menus[cornerId];
                const cornerDisplayName = menu?.cornerDisplayName || CORNER_DISPLAY_NAMES[cornerId] || cornerId;

                return (
                    <MenuCornerCard
                        key={cornerId}
                        menu={menu || null}
                        dayKey={dayKey}
                        restaurantId={restaurant.id}
                        cornerId={cornerId}
                        cornerDisplayName={cornerDisplayName}
                        isActive={isActive}
                    />
                );
            })}
        </div>
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


            <div className="flex flex-col gap-4">
                {/* Breakfast Section */}
                {groupedCorners.breakfast.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-bold text-[#0E4A84] bg-[#0E4A84]/10 px-3 py-1 rounded-full">
                                아침
                            </span>
                        </div>
                        {renderCornerList(groupedCorners.breakfast)}
                    </div>
                )}

                {/* Lunch Section */}
                {groupedCorners.lunch.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-bold text-[#0E4A84] bg-[#0E4A84]/10 px-3 py-1 rounded-full">
                                점심
                            </span>
                        </div>
                        {renderCornerList(groupedCorners.lunch)}
                    </div>
                )}

                {/* Dinner Section */}
                {groupedCorners.dinner.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-bold text-[#0E4A84] bg-[#0E4A84]/10 px-3 py-1 rounded-full">
                                저녁
                            </span>
                        </div>
                        {renderCornerList(groupedCorners.dinner)}
                    </div>
                )}
            </div>
        </section>
    );
}
