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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Info, MapPin, Clock } from 'lucide-react';
import type { RestaurantInfo, MenuItem, WaitingData } from '@shared/types';
import type { DayKey } from '@/lib/dateUtils';
import { getCornerStatuses, sortCornersByStatus } from '@/lib/domain/schedule';
import { CORNER_DISPLAY_NAMES } from '@shared/cornerDisplayNames';

interface RestaurantSectionProps {
  restaurant: RestaurantInfo;
  menus: Record<string, MenuItem>;
  waitingData: WaitingData[];
  dayKey: DayKey;
  referenceTime: string | null;  // "HH:MM" format, or null for no selection (all inactive)
}

export function RestaurantSection({ restaurant, menus, waitingData, dayKey, referenceTime }: RestaurantSectionProps) {
  const waitingMap = new Map(
    waitingData
      .filter((w) => w.restaurantId === restaurant.id)
      .map((w) => [w.cornerId, w])
  );

  // Compute active status for all corners and sort (active first)
  // Pass menus to getCornerStatuses for corners with requiresMenuDataForActive flag
  const sortedCorners = useMemo(() => {
    const statuses = getCornerStatuses(
      restaurant.id,
      restaurant.cornerOrder,
      dayKey,
      referenceTime,
      menus, // For corners like materials/rice_bowl that require menu data
    );
    return sortCornersByStatus(statuses);
  }, [restaurant.id, restaurant.cornerOrder, dayKey, referenceTime, menus]);

  return (
    <section className="mb-6" data-testid={`section-restaurant-${restaurant.id}`}>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-bold text-foreground">{restaurant.name}</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
              <Info className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm mx-4 rounded-lg">
            <DialogHeader>
              <DialogTitle>{restaurant.name} 정보</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <h4 className="font-semibold mb-1.5 flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4" /> 위치
                </h4>
                <p className="text-sm text-muted-foreground pl-6">{restaurant.location}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1.5 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4" /> 운영시간
                </h4>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans pl-6 leading-relaxed">
                  {restaurant.hours}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
