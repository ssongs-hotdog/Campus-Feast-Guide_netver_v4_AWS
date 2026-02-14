/**
 * Home.tsx - Main Home Page (Today View)
 * 
 * Purpose: Displays 'Today's' menu and waiting data.
 * Features:
 * - Strict Today View (KST)
 * - Restaurant Filtering (Chips)
 * - Future Forecast Mode (Bottom Sheet)
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Ticket, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RestaurantSection } from '@/components/RestaurantSection';
import { ForecastSheet } from '@/components/ForecastSheet';
import { useTimeContext } from '@/lib/timeContext';
import { useTicketContext } from '@/lib/ticketContext';
import { RESTAURANTS, formatTime, type WaitingData, type MenuData } from '@shared/types';
import { getTodayKey, formatDayKeyForDisplay, type DayKey } from '@/lib/dateUtils';
import { getMenus, getWaitTimes, getLatestWaitTimes, getConfig } from '@/lib/data/dataProvider';
import { addMinutes, startOfDay, addDays, getMinutes, setMinutes } from 'date-fns';

function Banner() {
  const [imageError, setImageError] = useState(false);
  const handleImageError = useCallback(() => setImageError(true), []);

  return (
    <div
      className="w-full rounded-lg overflow-hidden shadow-sm border border-border"
      style={{ aspectRatio: '2.35 / 1' }}
    >
      {imageError ? (
        <div className="w-full h-full bg-[#0e4194] flex items-center justify-center">
          <span className="text-white/60 text-sm">HY-eat</span>
        </div>
      ) : (
        <img
          src="/banner.png"
          alt="HY-eat 배너"
          className="w-full h-full"
          style={{ objectFit: 'contain', backgroundColor: '#0e4194' }}
          onError={handleImageError}
        />
      )}
    </div>
  );
}

// Helper to normalize date to nearest 5 minutes (floor or round)
// Policy: "Floor" to nearest 5 min to ensure we don't ask for future data that doesn't exist yet if we are slightly ahead?
// Actually for prediction, we just want standard 5-min buckets.
function normalizeTo5Min(date: Date): Date {
  const minutes = getMinutes(date);
  const roundedMinutes = Math.floor(minutes / 5) * 5;
  return setMinutes(date, roundedMinutes);
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { todayKey } = useTimeContext(); // This comes from Context, initialized to KST
  const { ticket } = useTicketContext();

  // State
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [forecastOffset, setForecastOffset] = useState<number>(0); // 0 = Live/Now
  const [isForecastSheetOpen, setIsForecastSheetOpen] = useState(false);

  // Computed Dates
  const now = new Date();
  const displayTime = useMemo(() => addMinutes(now, forecastOffset), [now, forecastOffset]);
  const isForecastMode = forecastOffset > 0;

  // Strict Today Key (from context or recalc)
  const activeDayKey: DayKey = todayKey;

  const displayDateStr = formatDayKeyForDisplay(activeDayKey, todayKey);
  const displayTimeStr = isForecastMode
    ? formatTime(displayTime)
    : formatTime(now);

  // Queries
  const { data: menuData } = useQuery<MenuData | null>({
    queryKey: ['/api/menu', activeDayKey],
    queryFn: async () => {
      const result = await getMenus(activeDayKey);
      if (result.error) throw new Error(result.error);
      return result.data as MenuData | null;
    },
  });

  const { data: configData } = useQuery({
    queryKey: ['/api/config'],
    queryFn: async () => {
      const result = await getConfig();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    staleTime: 60000,
  });

  const useDbWaiting = configData?.useDbWaiting ?? false;

  // Waiting Data Query
  // Live: getLatestWaitTimes
  // Forecast: getWaitTimes with specific timestamp
  const { data: waitingData, isLoading: isWaitingLoading } = useQuery<WaitingData[]>({
    queryKey: isForecastMode
      ? ['/api/waiting', activeDayKey, normalizeTo5Min(displayTime).toISOString()]
      : ['/api/waiting/latest', activeDayKey], // Live
    queryFn: async () => {
      if (isForecastMode) {
        // Fetch for specific time
        // Note: We need a full ISO string or whatever getWaitTimes expects. 
        // dataProvider.ts getWaitTimes takes `time` string (HH:MM)? No, checking provider...
        // Provider: getWaitTimes(dayKey, time: string). API expects HH:MM usually?
        // Let's check dataProvider signature. It says `time: string`. 
        // Typically strict ISO or HH:MM? The backend usually handles HH:MM for queries.
        // Let's use HH:MM format for safety if API supports it, or full ISO if needed.
        // The previous code `currentTimestamp` was ISO from `availableTimestamps`.
        // Let's pass ISO string to be safe if that's what `getWaitTimes` expects for exact lookup.
        // Actually, looking at `getWaitTimes` implementation: `waiting?date=${dayKey}&time=${time}`.
        // If the backend parses `time`, HH:MM is standard for this app. 
        // Let's try formatting to HH:MM first.
        const timeStr = formatTime(normalizeTo5Min(displayTime));
        const result = await getWaitTimes(activeDayKey, timeStr, '5min');
        if (result.error) throw new Error(result.error);
        return result.data || [];
      } else {
        // Live
        const result = await getLatestWaitTimes(activeDayKey);
        if (result.error) throw new Error(result.error);
        return result.data || [];
      }
    },
    // Refetch interval: Live = 30s, Forecast = Manual/Static (no auto refetch)
    refetchInterval: isForecastMode ? false : 30000,
  });

  // Derived Data
  const hasActiveTicket = ticket && (ticket.status === 'stored' || ticket.status === 'active');
  const filteredRestaurants = useMemo(() => {
    if (!selectedRestaurantId) return RESTAURANTS;
    return RESTAURANTS.filter(r => r.id === selectedRestaurantId);
  }, [selectedRestaurantId]);

  // Handlers
  const handleApplyForecast = (offset: number, cornerId?: string) => {
    setForecastOffset(offset);
    if (cornerId) {
      // Scroll to corner
      // Simple implementation: standard anchor scrolling
      // We might need a small timeout to allow DOM to update if filtering changes
      setTimeout(() => {
        const element = document.getElementById(`corner-${cornerId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      // Also ensure the restaurant is visible if filtered? 
      // Constraint: "Corner selection INSIDE the bottom sheet (not on each card)"
      // "The user flow should be: Choose time offset... Choose a corner... Apply"
      // If a corner is chosen, we should probably ensure its restaurant is active?
      // Let's find the restaurant for this corner and select it.
      if (!selectedRestaurantId) {
        const rest = RESTAURANTS.find(r => r.cornerOrder.includes(cornerId));
        if (rest) setSelectedRestaurantId(rest.id);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border pb-2 pt-3 px-4">
        <div className="max-w-lg mx-auto flex flex-col gap-3">
          {/* Top Row: Title/Date/Ticket */}
          <div className="flex items-center justify-between">
            {/* Replaced Date Nav with simple Logo or Home Text if needed, 
                 but requirement is "Replace the date header area with a thin ... status line" 
                 Actually, usually there's a Title. "Campus Feast Guide"? 
                 "today-only" status line is "under the banner" per requirement 2.
                 Wait, "Replace the date header area with a thin status line... placed directly under the banner"?
                 Requirement 2 says: "Remove Home date navigation UI... Replace it with a thin status line... placed directly under the banner"
                 
                 Structure:
                 Header (Sticky) -> App Title? Ticket?
                 Body -> Banner -> Status Line -> Chips -> CTA -> List?
                 
                 Reviewing "Scope constraints": "Remove the Home date navigation UI... visual confusion...".
                 So the header where "2024-02-14 < >" was should probably be simplified or gone.
                 Existing header had ChevronLeft, Date, ChevronRight.
                 
                 Let's make the sticky header minimal: "HY-eat" logo/text + Ticket.
             */}
            <h1 className="text-xl font-bold text-primary">HY-eat</h1>

            {hasActiveTicket && (
              <Button
                variant="default"
                size="icon"
                onClick={() => setLocation('/ticket')}
                className="relative w-8 h-8 rounded-full"
              >
                <Ticket className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* 1. Banner */}
        <Banner />

        {/* 2. Status Line */}
        <div className="flex items-center justify-center text-sm text-muted-foreground bg-muted/30 py-1.5 rounded-md">
          <span>
            오늘 {displayDateStr} · <span className="font-medium text-foreground">{displayTimeStr}</span> {isForecastMode ? '예측' : '기준'}
          </span>
        </div>

        {/* 3. Restaurant Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <Button
            variant={selectedRestaurantId === null ? 'default' : 'outline'}
            size="sm"
            className="rounded-full px-4 flex-shrink-0"
            onClick={() => setSelectedRestaurantId(null)}
          >
            전체
          </Button>
          {RESTAURANTS.map(r => (
            <Button
              key={r.id}
              variant={selectedRestaurantId === r.id ? 'default' : 'outline'}
              size="sm"
              className="rounded-full px-4 flex-shrink-0"
              onClick={() => setSelectedRestaurantId(selectedRestaurantId === r.id ? null : r.id)}
            >
              {r.name}
            </Button>
          ))}
        </div>

        {/* 4. Forecast CTA */}
        <Button
          variant="outline"
          className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/5 hover:text-primary"
          onClick={() => setIsForecastSheetOpen(true)}
        >
          {isForecastMode ? (
            <span className="font-bold">⏱ {forecastOffset}분 후 시간 예측 중 (클릭하여 변경)</span>
          ) : (
            <span>⏱ 대기 시간 예측 / 미리보기</span>
          )}
        </Button>

        {/* 5. Restaurant List */}
        <div className="space-y-6 mt-2">
          {isWaitingLoading && !waitingData && !menuData ? (
            // Loading Skeleton
            <div className="space-y-8">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="h-6 w-1/3 bg-muted rounded" />
                  <div className="h-24 bg-muted rounded-lg" />
                  <div className="h-24 bg-muted rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            filteredRestaurants.map(restaurant => (
              <div key={restaurant.id} id={`restaurant-${restaurant.id}`}>
                <RestaurantSection
                  restaurant={restaurant}
                  menus={menuData?.[restaurant.id] || {}}
                  waitingData={waitingData || []} // We process this inside? Or pass raw? RestaurantSection takes WaitingData[]
                  dayKey={activeDayKey}
                  referenceTime={null} // Not using referenceTime for "sim mode" highlighting in the old way, OR pass timeStr?
                  // Actually RestaurantSection uses referenceTime to gray out inactive corners.
                  // We should pass displayTimeStr (HH:MM) so it knows what "Now" is for active/inactive check.
                  referenceTimeStr={formatTime(displayTime)}
                />
              </div>
            ))
          )}
        </div>
      </main>

      <ForecastSheet
        isOpen={isForecastSheetOpen}
        onOpenChange={setIsForecastSheetOpen}
        selectedOffset={forecastOffset}
        onApply={handleApplyForecast}
        activeRestaurantId={selectedRestaurantId}
      />
    </div>
  );
}
