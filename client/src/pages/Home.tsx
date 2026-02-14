/**
 * Home.tsx - Main Home Page
 * 
 * Purpose: Displays the main view of all restaurants and their menu/waiting data
 * for a specific date. The date is determined by the URL path (/d/YYYY-MM-DD).
 * 
 * Key features:
 * - URL-driven date navigation (refresh-safe, shareable)
 * - Shows menu data for each restaurant corner
 * - Displays real-time or historical congestion data
 * - Supports previous/next date navigation
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { ChevronLeft, ChevronRight, Ticket, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RestaurantSection } from '@/components/RestaurantSection';
import { useTimeContext } from '@/lib/timeContext';
import { useTicketContext } from '@/lib/ticketContext';
import { RESTAURANTS, formatTime, type WaitingData, type MenuData } from '@shared/types';
import { addDays, formatDayKeyForDisplay, isValidDayKey, type DayKey } from '@/lib/dateUtils';
import { getMenus, getWaitTimes, getAvailableTimestamps, getLatestWaitTimes, getConfig } from '@/lib/data/dataProvider';

function Banner() {
  const [imageError, setImageError] = useState(false);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  return (
    <div
      className="w-full rounded-lg overflow-hidden shadow-sm border border-border"
      style={{ aspectRatio: '2.35 / 1' }}
      data-testid="banner-container"
    >
      {imageError ? (
        <div
          className="w-full h-full bg-[#0e4194] flex items-center justify-center"
          data-testid="banner-placeholder"
        >
          <span className="text-white/60 text-sm">HY-eat</span>
        </div>
      ) : (
        <img
          src="/banner.png"
          alt="HY-eat 배너"
          className="w-full h-full"
          style={{ objectFit: 'contain', backgroundColor: '#0e4194' }}
          onError={handleImageError}
          data-testid="banner-image"
        />
      )}
    </div>
  );
}

// Time options for the time selector dropdown (single source of truth)
// Range: 08:00 to 18:00 in 10-minute increments
const TIME_OPTIONS = (() => {
  const options: string[] = [];
  for (let h = 8; h <= 18; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === 18 && m > 30) break; // Stop at 18:30
      options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return options;
})();

export default function Home() {
  const [, params] = useRoute('/d/:dayKey');
  const [, setLocation] = useLocation();

  const {
    timeState,
    setAvailableTimestamps,
    selectedTime5Min,
    setSelectedTime5Min,
    todayKey,
  } = useTimeContext();
  const { ticket } = useTicketContext();
  const [isTimeSelectorOpen, setIsTimeSelectorOpen] = useState(false);

  // Validate dayKey from URL - redirect to today if missing or invalid
  const rawDayKey = params?.dayKey || '';
  const selectedDate: DayKey = isValidDayKey(rawDayKey) ? rawDayKey : todayKey;

  // Redirect to today if dayKey is missing or invalid
  useEffect(() => {
    if (!rawDayKey || !isValidDayKey(rawDayKey)) {
      setLocation(`/d/${todayKey}`, { replace: true });
    }
  }, [rawDayKey, todayKey, setLocation]);

  const isToday = selectedDate === todayKey;

  const goPrevDate = useCallback(() => {
    const prevDate = addDays(selectedDate, -1);
    setLocation(`/d/${prevDate}`);
  }, [selectedDate, setLocation]);

  const goNextDate = useCallback(() => {
    const nextDate = addDays(selectedDate, 1);
    setLocation(`/d/${nextDate}`);
  }, [selectedDate, setLocation]);

  const { data: menuData } = useQuery<MenuData | null>({
    queryKey: ['/api/menu', selectedDate],
    queryFn: async () => {
      const result = await getMenus(selectedDate);
      if (result.error) throw new Error(result.error);
      return result.data as MenuData | null;
    },
    enabled: !!selectedDate,
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
  const tomorrowKey = configData?.tomorrow || addDays(todayKey, 1);
  const isTomorrow = selectedDate === tomorrowKey;
  const isPast = selectedDate < todayKey;
  const showTimeSelector = !isToday && (isPast || isTomorrow);

  const { data: timestampsData } = useQuery<{ timestamps: string[] }>({
    queryKey: ['/api/waiting/timestamps', selectedDate],
    queryFn: async () => {
      const result = await getAvailableTimestamps(selectedDate);
      if (result.error) throw new Error(result.error);
      return { timestamps: result.data || [] };
    },
    enabled: !!selectedDate && !(isToday && useDbWaiting),
  });

  useEffect(() => {
    if (timestampsData?.timestamps && isToday) {
      setAvailableTimestamps(timestampsData.timestamps);
    }
  }, [timestampsData, setAvailableTimestamps, isToday]);

  const currentTimestamp = useMemo(() => {
    if (!timestampsData?.timestamps?.length) return null;
    const targetTime = timeState.displayTime.getTime();
    let closestIdx = 0;
    let minDiff = Math.abs(new Date(timestampsData.timestamps[0]).getTime() - targetTime);

    for (let i = 1; i < timestampsData.timestamps.length; i++) {
      const diff = Math.abs(new Date(timestampsData.timestamps[i]).getTime() - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    return timestampsData.timestamps[closestIdx];
  }, [timestampsData?.timestamps, timeState.displayTime]);

  const useLiveEndpoint = isToday && useDbWaiting;

  const { data: waitingData, isLoading: isWaitingLoading } = useQuery<WaitingData[]>({
    queryKey: useLiveEndpoint
      ? ['/api/waiting/latest', selectedDate]
      : isToday
        ? ['/api/waiting', selectedDate, currentTimestamp]
        : ['/api/waiting', selectedDate, selectedTime5Min, '5min'],
    queryFn: async () => {
      if (useLiveEndpoint) {
        const result = await getLatestWaitTimes(selectedDate);
        if (result.error) throw new Error(result.error);
        return result.data || [];
      } else if (isToday) {
        const result = await getWaitTimes(selectedDate, currentTimestamp!);
        if (result.error) throw new Error(result.error);
        return result.data || [];
      } else {
        const result = await getWaitTimes(selectedDate, selectedTime5Min!, '5min');
        if (result.error) throw new Error(result.error);
        return result.data || [];
      }
    },
    enabled: !!selectedDate && (useLiveEndpoint || (isToday ? !!currentTimestamp : !!selectedTime5Min)),
    staleTime: useLiveEndpoint ? 0 : 60000,
    placeholderData: (previousData) => previousData,
    refetchInterval: useLiveEndpoint ? 30000 : false,
    refetchIntervalInBackground: false,
  });

  // Fix for Main/Detail Discrepancy:
  // When a specific time is selected (e.g. 12:00), we get a range of data (12:00~12:04).
  // Previously, we just used the raw array which might be processed differently by children.
  // Now, we pre-process it to find the *closest* data point to the selected time for each corner.
  const processedWaitingData = useMemo(() => {
    if (!waitingData || waitingData.length === 0) return [];

    // If it's today/live, we just use the latest data as is
    if (isToday) return waitingData;

    // For past/future dates with time selection
    if (selectedTime5Min) {
      const targetTimeStr = selectedTime5Min; // HH:MM

      // Group by corner
      const byCorner = new Map<string, WaitingData[]>();
      waitingData.forEach(d => {
        const key = `${d.restaurantId}#${d.cornerId}`;
        if (!byCorner.has(key)) byCorner.set(key, []);
        byCorner.get(key)!.push(d);
      });

      const result: WaitingData[] = [];

      byCorner.forEach((items) => {
        // Find item with timestamp closest to targetTimeStr
        // Since API returns ISO timestamps, we need to extract HH:MM
        // But for simplicity in the 5-min bucket, we can just sort by timestamp
        // and pick the first one (Start of Bucket) which is usually the target time (e.g. 12:00)
        // OR we can explicitly compare minutes.

        // Let's pick the one with the smallest minute difference to the target minutes.
        const [targetH, targetM] = targetTimeStr.split(':').map(Number);
        const targetMinutes = targetH * 60 + targetM;

        let bestItem = items[0];
        let minDiff = Infinity;

        for (const item of items) {
          const date = new Date(item.timestamp);
          const h = date.getHours();
          const m = date.getMinutes();
          const itemMinutes = h * 60 + m;
          const diff = Math.abs(itemMinutes - targetMinutes);

          if (diff < minDiff) {
            minDiff = diff;
            bestItem = item;
          }
        }
        result.push(bestItem);
      });

      return result;
    }

    return waitingData;
  }, [waitingData, isToday, selectedTime5Min]);

  const displayDate = formatDayKeyForDisplay(selectedDate, todayKey);
  const hasActiveTicket = ticket && (ticket.status === 'stored' || ticket.status === 'active');

  // Display timestamp: only show when data is loaded
  // For non-today with no selection (null), don't show timestamp
  const loadedTimestamp = isToday && processedWaitingData?.[0]?.timestamp
    ? formatTime(new Date(processedWaitingData[0].timestamp))
    : (!isToday && selectedTime5Min) ? selectedTime5Min : null;

  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);

  // Format current time as HH:MM in Korea timezone (KST, UTC+9)
  const getCurrentTimeKST = useCallback(() => {
    // Use Intl.DateTimeFormat to get time in Korea timezone
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hour = parts.find(p => p.type === 'hour')?.value || '12';
    const minute = parts.find(p => p.type === 'minute')?.value || '00';
    return `${hour}:${minute}`;
  }, []);

  // Reference time for schedule-based active/inactive status
  // - Today: always use current Korea time (KST)
  // - Non-today: use selected time, or null if no selection (all corners inactive)
  const referenceTime = useMemo(() => {
    if (isToday) {
      // For today, use current Korea time (KST)
      // scheduleRefreshKey triggers re-computation every 10 minutes
      void scheduleRefreshKey; // Dependency marker
      return getCurrentTimeKST();
    } else {
      // For non-today dates: null = no selection = all corners inactive
      return selectedTime5Min;
    }
  }, [isToday, selectedTime5Min, scheduleRefreshKey, getCurrentTimeKST]);

  // Refresh schedule every 10 minutes for today only
  // Clear interval immediately when leaving today view
  useEffect(() => {
    if (!isToday) {
      // Not today - no interval needed, reset key to ensure fresh state when returning
      setScheduleRefreshKey(0);
      return;
    }

    const interval = setInterval(() => {
      setScheduleRefreshKey(prev => prev + 1);
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [isToday]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={goPrevDate}
            data-testid="button-prev-date"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-base font-semibold text-foreground" data-testid="text-date">
            {displayDate}
          </h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              onClick={goNextDate}
              data-testid="button-next-date"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            {hasActiveTicket && (
              <Button
                variant="default"
                size="icon"
                onClick={() => setLocation('/ticket')}
                className="relative"
                data-testid="button-ticket"
              >
                <Ticket className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
              </Button>
            )}
          </div>
        </div>

        {showTimeSelector && (
          <div className="max-w-lg mx-auto mt-2">
            <button
              onClick={() => setIsTimeSelectorOpen(!isTimeSelectorOpen)}
              className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-lg text-sm"
              data-testid="button-time-selector-toggle"
            >
              <span className="text-muted-foreground">
                {isPast ? '시간 선택 (통계 데이터 제공)' : '시간 선택 (예측 데이터 제공)'}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium" data-testid="text-selected-time">{selectedTime5Min ?? '-'}</span>
                {isTimeSelectorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isTimeSelectorOpen && (
              <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                <label className="block text-sm text-muted-foreground mb-2">
                  {isPast ? '시간 선택 (통계 데이터 제공)' : '시간 선택 (예측 데이터 제공)'}
                </label>
                <select
                  value={selectedTime5Min ?? ''}
                  onChange={(e) => {
                    setSelectedTime5Min(e.target.value || null);
                    setIsTimeSelectorOpen(false);
                  }}
                  className="w-full p-3 bg-background border border-border rounded-lg text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="select-time-5min"
                >
                  <option value="">-</option>
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">

        <div className="mb-4">
          <Banner />
        </div>


        {isWaitingLoading && !waitingData && !menuData ? (
          <div className="space-y-4">
            {RESTAURANTS.map((r) => (
              <div key={r.id} className="animate-pulse">
                <div className="h-6 w-32 bg-muted rounded mb-3" />
                <div className="space-y-3">
                  {r.cornerOrder.map((c) => (
                    <div key={c} className="h-24 bg-muted rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {loadedTimestamp && (
              <div className="text-xs text-muted-foreground mb-3 text-center" data-testid="text-loaded-timestamp">
                데이터 시각: {loadedTimestamp}
              </div>
            )}
            {RESTAURANTS.map((restaurant) => (
              <RestaurantSection
                key={restaurant.id}
                restaurant={restaurant}
                menus={menuData?.[restaurant.id] || {}}
                waitingData={(isToday || selectedTime5Min) ? (processedWaitingData || []) : []}
                dayKey={selectedDate}
                referenceTime={referenceTime}
              />
            ))}
          </>
        )}
      </main>

      <footer className="border-t border-border py-4 mt-8">
        <p className="text-center text-xs text-muted-foreground">
          HY-eat - 한양대학교 학생식당 혼잡도 모니터링
        </p>
      </footer>
    </div>
  );
}
