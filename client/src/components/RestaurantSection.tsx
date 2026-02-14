import { useMemo, useState } from 'react';
import { CornerCard } from './CornerCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  referenceTime: string | null;  // Still used for active/inactive logic, can be null or HH:MM
  referenceTimeStr?: string; // Optional passed for display or alternate logic
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
      menus,
    );
    return sortCornersByStatus(statuses);
  }, [restaurant.id, restaurant.cornerOrder, dayKey, referenceTime, menus]);

  return (
    <section className="mb-6 border-b pb-4 last:border-0" data-testid={`section-restaurant-${restaurant.id}`}>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          {restaurant.name}
        </h2>

        {/* Info Icon Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
              <Info className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xs rounded-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {restaurant.name} 정보
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold mb-1">위치</h4>
                  <p className="text-sm text-muted-foreground leading-snug">
                    {restaurant.location}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold mb-1">운영시간</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-snug">
                    {restaurant.hours}
                  </p>
                </div>
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
            <div key={cornerId} id={`corner-${cornerId}`}>
              <CornerCard
                menu={menu || null}
                waitingData={waitingMap.get(cornerId)}
                dayKey={dayKey}
                restaurantId={restaurant.id}
                cornerId={cornerId}
                cornerDisplayName={cornerDisplayName}
                isActive={isActive}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
