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
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { RestaurantSection } from '@/components/RestaurantSection';
import { useTimeContext } from '@/lib/timeContext';
import { useTicketContext } from '@/lib/ticketContext';
import { RESTAURANTS, formatTime, type WaitingData, type MenuData } from '@shared/types';
import { addDays, formatDayKeyForDisplay, isValidDayKey, type DayKey } from '@/lib/dateUtils';
import { getMenus, getWaitTimes, getAvailableTimestamps, getLatestWaitTimes, getConfig } from '@/lib/data/dataProvider';
import { Clock } from 'lucide-react';

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

// Helper to add minutes to a date
const addMinutes = (date: Date, minutes: number) => {
  return new Date(date.getTime() + minutes * 60000);
};

export default function Home() {
  const [, setLocation] = useLocation();

  const {
    timeState,
    setAvailableTimestamps,
    selectedTime5Min,
    setSelectedTime5Min,
    todayKey,
    setDisplayTime,
    goToRealtime,
  } = useTimeContext();
  const { ticket } = useTicketContext();

  // State for Restaurant Selector
  // null = '전체' (All)
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);

  // Prediction Drawer State
  const [isPredictionOpen, setIsPredictionOpen] = useState(false);

  // Always show "Today"
  const selectedDate: DayKey = todayKey;
  const isToday = true;

  // Cleanup: removed goPrevDate, goNextDate

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

  // Removed Past/Future logic variables (tomorrowKey, isBetween, etc)

  // Prediction Logic
  // If selectedTime5Min is set, we are in prediction mode
  // Otherwise we are in Live mode (if useDbWaiting is true)
  const isPredictionMode = !!selectedTime5Min;

  const { data: timestampsData } = useQuery<{ timestamps: string[] }>({
    queryKey: ['/api/waiting/timestamps', selectedDate],
    queryFn: async () => {
      const result = await getAvailableTimestamps(selectedDate);
      if (result.error) throw new Error(result.error);
      return { timestamps: result.data || [] };
    },
    enabled: !!selectedDate && !useDbWaiting && !isPredictionMode, // Only fetch if manual fallback needed
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

  const useLiveEndpoint = isToday && useDbWaiting && !isPredictionMode;

  const { data: waitingData, isLoading: isWaitingLoading } = useQuery<WaitingData[]>({
    queryKey: useLiveEndpoint
      ? ['/api/waiting/latest', selectedDate]
      : ['/api/waiting', selectedDate, selectedTime5Min || currentTimestamp, '5min'], // Fallback to currentTimestamp if not prediction
    queryFn: async () => {
      if (useLiveEndpoint) {
        const result = await getLatestWaitTimes(selectedDate);
        if (result.error) throw new Error(result.error);
        return result.data || [];
      } else {
        // For prediction or fallback
        const targetTime = selectedTime5Min || currentTimestamp;
        // If we don't have a time, just return empty? or try fetching?
        if (!targetTime) return [];

        const result = await getWaitTimes(selectedDate, targetTime, '5min');
        if (result.error) throw new Error(result.error);
        return result.data || [];
      }
    },
    enabled: !!selectedDate && (useLiveEndpoint || !!selectedTime5Min || !!currentTimestamp),
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

    // If it's live/today (and not prediction with manual time override needed), use as is
    if (useLiveEndpoint) return waitingData;

    // For PREDICTION (selectedTime5Min), we want to show the specific predicted data
    // The query returns arrays. If the API returns a range, we filter for closest.
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
  }, [waitingData, useLiveEndpoint, selectedTime5Min]);

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

  // Handle prediction selection
  const handlePredictionSelect = (minutes: number) => {
    if (minutes === 0) {
      // "Now"
      setSelectedTime5Min(null);
      goToRealtime();
    } else {
      // Future
      const now = new Date();
      const future = addMinutes(now, minutes);
      const timeStr = formatTime(future); // HH:MM
      setSelectedTime5Min(timeStr);
      setDisplayTime(future);
    }
    setIsPredictionOpen(false);
  };

  const filteredRestaurants = useMemo(() => {
    if (!selectedRestaurantId) return RESTAURANTS;
    return RESTAURANTS.filter(r => r.id === selectedRestaurantId);
  }, [selectedRestaurantId]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header removed from here - relying on TopAppBar in App.tsx */}

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* Banner */}
        <div className="mb-4">
          <Banner />
        </div>

        {/* Status Line */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4 px-1" data-testid="status-line">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isPredictionMode ? 'bg-purple-500' : 'bg-green-500'}`} />
            {isPredictionMode ? (
              <span>{selectedTime5Min} 기준 (예측)</span>
            ) : (
              <span>오늘 {displayDate} · {getCurrentTimeKST()} 기준</span>
            )}
          </div>
        </div>

        {/* Restaurant Selector */}
        <div className="mb-6 overflow-x-auto whitespace-nowrap pb-1 -mx-4 px-4 scrollbar-hide">
          <div className="flex gap-2">
            <Badge
              variant={selectedRestaurantId === null ? "default" : "outline"}
              className="cursor-pointer text-sm px-4 py-1.5 h-8 rounded-full transition-colors"
              onClick={() => setSelectedRestaurantId(null)}
            >
              전체
            </Badge>
            {RESTAURANTS.map(restaurant => (
              <Badge
                key={restaurant.id}
                variant={selectedRestaurantId === restaurant.id ? "default" : "outline"}
                className="cursor-pointer text-sm px-4 py-1.5 h-8 rounded-full transition-colors"
                onClick={() => setSelectedRestaurantId(selectedRestaurantId === restaurant.id ? null : restaurant.id)}
              >
                {restaurant.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Prediction CTA */}
        <div className="mb-6">
          <Button
            className="w-full bg-white text-foreground border border-border hover:bg-muted/50 shadow-sm flex items-center justify-center gap-2 h-12 text-base font-medium transition-all"
            onClick={() => setIsPredictionOpen(true)}
          >
            <Clock className="w-4 h-4 text-primary" />
            {isPredictionMode ? '나중에 먹기 (시간 변경됨)' : '골든타임 찾기 (대기시간 예측)'}
          </Button>

          <Drawer open={isPredictionOpen} onOpenChange={setIsPredictionOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>언제 식사하시나요?</DrawerTitle>
                <DrawerDescription>
                  시간을 선택하면 예상 대기시간을 알려드려요.
                </DrawerDescription>
              </DrawerHeader>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant={!isPredictionMode ? "default" : "outline"}
                    className="h-14 flex flex-col gap-1"
                    onClick={() => handlePredictionSelect(0)}
                  >
                    <span className="text-sm font-medium">지금</span>
                    <span className="text-xs opacity-70">실시간</span>
                  </Button>
                  <Button
                    variant={selectedTime5Min === formatTime(addMinutes(new Date(), 10)) ? "default" : "outline"}
                    className="h-14 flex flex-col gap-1"
                    onClick={() => handlePredictionSelect(10)}
                  >
                    <span className="text-sm font-medium">+10분</span>
                  </Button>
                  <Button
                    variant={selectedTime5Min === formatTime(addMinutes(new Date(), 20)) ? "default" : "outline"}
                    className="h-14 flex flex-col gap-1"
                    onClick={() => handlePredictionSelect(20)}
                  >
                    <span className="text-sm font-medium">+20분</span>
                  </Button>
                  <Button
                    variant={selectedTime5Min === formatTime(addMinutes(new Date(), 30)) ? "default" : "outline"}
                    className="h-14 flex flex-col gap-1"
                    onClick={() => handlePredictionSelect(30)}
                  >
                    <span className="text-sm font-medium">+30분</span>
                  </Button>
                </div>
              </div>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="outline">닫기</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
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
            {filteredRestaurants.map((restaurant) => (
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
