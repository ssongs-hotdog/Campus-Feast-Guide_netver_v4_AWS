/**
 * Home.tsx - Main Home Page
 * 
 * Purpose: Displays the main view of all restaurants and their menu/waiting data
 * for TODAY only. Date navigation has been removed as per the "Today-only" requirement.
 * Includes a restaurant selector for filtering.
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RestaurantSection } from '@/components/RestaurantSection';
import { RestaurantSelector } from '@/components/RestaurantSelector';
import { useTimeContext } from '@/lib/timeContext';
import { useTicketContext } from '@/lib/ticketContext';
import { RESTAURANTS, formatTime, type WaitingData, type MenuData } from '@shared/types';
import { isValidDayKey, type DayKey } from '@/lib/dateUtils';
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
  // Removed URL based date routing. Always uses todayKey.
  const [, setLocation] = useLocation();

  const {
    timeState,
    setAvailableTimestamps,
    selectedTime5Min,
    todayKey,
  } = useTimeContext();
  const { ticket } = useTicketContext();

  // New State for Restaurant Selector
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('all');

  // Hardcode selectedDate to today
  const selectedDate: DayKey = todayKey;
  const isToday = true; // Always true in this view

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

  const processedWaitingData = useMemo(() => {
    if (!waitingData || waitingData.length === 0) return [];
    if (isToday) return waitingData;
    return waitingData; // Simplified since we are only doing today
  }, [waitingData, isToday]);

  // Format Date for Display: "2월 14일 (금)"
  const formattedDate = useMemo(() => {
    const d = new Date();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = days[d.getDay()];
    return `${month}월 ${day}일 (${dayName})`;
  }, []);

  const hasActiveTicket = ticket && (ticket.status === 'stored' || ticket.status === 'active');

  const loadedTimestamp = isToday && processedWaitingData?.[0]?.timestamp
    ? formatTime(new Date(processedWaitingData[0].timestamp))
    : null;

  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);

  const getCurrentTimeKST = useCallback(() => {
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

  const referenceTime = useMemo(() => {
    void scheduleRefreshKey;
    return getCurrentTimeKST();
  }, [scheduleRefreshKey, getCurrentTimeKST]);

  useEffect(() => {
    const interval = setInterval(() => {
      setScheduleRefreshKey(prev => prev + 1);
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Filter restaurants based on selection
  const filteredRestaurants = useMemo(() => {
    if (selectedRestaurantId === 'all') return RESTAURANTS;
    return RESTAURANTS.filter(r => r.id === selectedRestaurantId);
  }, [selectedRestaurantId]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header with Ticket Button Only (Date Nav Removed) */}
      <header className="absolute top-0 left-0 right-0 z-50 px-4 py-3 bg-transparent">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {/* Logo or Title Placeholder if needed, otherwise empty space or ticket button alignment */}
          <div className="text-lg font-bold text-foreground">
            {/* Left Empty or Logo */}
          </div>

          <div className="flex items-center gap-1">
            {/* Ticket Button */}
            {hasActiveTicket && (
              <Button
                variant="default"
                size="icon"
                onClick={() => setLocation('/ticket')}
                className="relative shadow-md"
                data-testid="button-ticket"
              >
                <Ticket className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content with paddingtop to account for header area if needed, but since header is absolute/transparent and likely over banner, careful. 
          Actually user wants "remove white bar traces". If transparent header is over banner, that's fine.
          Let's add pt-safe or just py-4. If absolute header is 50px high, banner might be covered.
          But user said "remove white bar traces", implying they don't want the sticky header eating space?
          Let's just use normal flow or transparent absolute. 
          If absolute, banner is top. Ticket button floats on top.
      */}
      <main className="max-w-lg mx-auto px-4 py-4 pt-4">
        {/* Banner */}
        <div className="mb-4 pt-2"> {/* Reduced padding top from pt-10 to pt-2 */}
          <Banner />
        </div>

        {/* Date & Time Status Line - CENTERED */}
        <div className="text-sm text-gray-500 font-medium mb-2 text-center"> {/* Reduced margin bottom from mb-3 to mb-2 */}
          {formattedDate} {referenceTime} 기준
        </div>

        {/* Restaurant Selector - ALIGNED (Full bleed scroll) */}
        <div className="mb-2 -mx-4"> {/* Reduced margin bottom from mb-6 to mb-2 */}
          <RestaurantSelector
            restaurants={RESTAURANTS.map(r => ({ id: r.id, name: r.name }))}
            selectedId={selectedRestaurantId}
            onSelect={setSelectedRestaurantId}
          />
        </div>

        {isWaitingLoading && !waitingData && !menuData ? (
          <div className="space-y-4">
            {filteredRestaurants.map((r) => (
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
            {filteredRestaurants.map((restaurant) => (
              <RestaurantSection
                key={restaurant.id}
                restaurant={restaurant}
                menus={menuData?.[restaurant.id] || {}}
                waitingData={(processedWaitingData || [])}
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
