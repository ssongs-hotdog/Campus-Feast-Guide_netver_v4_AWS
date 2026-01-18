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
import { BottomTimePanel } from '@/components/BottomTimePanel';
import { ChartsPanel, ChartsPanelTrigger } from '@/components/ChartsPanel';
import { RestaurantSection } from '@/components/RestaurantSection';
import { useTimeContext } from '@/lib/timeContext';
import { useTicketContext } from '@/lib/ticketContext';
import { RESTAURANTS, formatTime, type WaitingData, type MenuData } from '@shared/types';
import { addDays, formatDayKeyForDisplay, isValidDayKey, type DayKey } from '@/lib/dateUtils';

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

const TIME_OPTIONS_5MIN = (() => {
  const options: string[] = [];
  for (let h = 11; h <= 14; h++) {
    for (let m = 0; m < 60; m += 5) {
      if (h === 14 && m > 0) break;
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
  const [isChartsOpen, setIsChartsOpen] = useState(false);
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

  const { data: menuData } = useQuery<MenuData>({
    queryKey: ['/api/menu', selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/menu?date=${selectedDate}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch menu data');
      }
      return res.json();
    },
    enabled: !!selectedDate,
  });

  const { data: timestampsData } = useQuery<{ timestamps: string[] }>({
    queryKey: ['/api/waiting/timestamps', selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/waiting/timestamps?date=${selectedDate}`);
      if (!res.ok) throw new Error('Failed to fetch timestamps');
      return res.json();
    },
    enabled: !!selectedDate,
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

  const { data: waitingData, isLoading: isWaitingLoading } = useQuery<WaitingData[]>({
    queryKey: isToday 
      ? ['/api/waiting', selectedDate, currentTimestamp]
      : ['/api/waiting', selectedDate, selectedTime5Min, '5min'],
    queryFn: async () => {
      if (isToday) {
        const res = await fetch(`/api/waiting?date=${selectedDate}&time=${encodeURIComponent(currentTimestamp!)}`);
        if (!res.ok) throw new Error('Failed to fetch waiting data');
        return res.json();
      } else {
        const res = await fetch(`/api/waiting?date=${selectedDate}&time=${selectedTime5Min}&aggregate=5min`);
        if (!res.ok) throw new Error('Failed to fetch waiting data');
        return res.json();
      }
    },
    enabled: !!selectedDate && (isToday ? !!currentTimestamp : true),
    staleTime: 60000,
    placeholderData: (previousData) => previousData,
  });

  const displayDate = formatDayKeyForDisplay(selectedDate, todayKey);
  const hasActiveTicket = ticket && (ticket.status === 'stored' || ticket.status === 'active');

  const loadedTimestamp = isToday && waitingData?.[0]?.timestamp 
    ? formatTime(new Date(waitingData[0].timestamp))
    : !isToday ? selectedTime5Min : null;

  // Reference time for schedule-based active/inactive status
  // For today: use current real time (Korea timezone)
  // For other dates: use dropdown time or default to 12:00
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);
  
  // Format current time as HH:MM for schedule comparison
  const getCurrentTimeHHMM = useCallback(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }, []);

  const referenceTime = useMemo(() => {
    if (isToday) {
      // For today, use current real time
      // scheduleRefreshKey triggers re-computation every 10 minutes
      void scheduleRefreshKey; // Dependency marker
      return getCurrentTimeHHMM();
    } else {
      // For other dates, use dropdown time (or 12:00 default which is already the default value)
      return selectedTime5Min;
    }
  }, [isToday, selectedTime5Min, scheduleRefreshKey, getCurrentTimeHHMM]);

  // Refresh schedule every 10 minutes for today
  useEffect(() => {
    if (!isToday) return;
    
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

        {!isToday && (
          <div className="max-w-lg mx-auto mt-2">
            <button
              onClick={() => setIsTimeSelectorOpen(!isTimeSelectorOpen)}
              className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-lg text-sm"
              data-testid="button-time-selector-toggle"
            >
              <span className="text-muted-foreground">
                {selectedDate < todayKey ? '시간 선택 (통계 데이터 제공)' : '시간 선택 (예측 데이터 제공)'}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium" data-testid="text-selected-time">{selectedTime5Min}</span>
                {isTimeSelectorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>
            
            {isTimeSelectorOpen && (
              <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                <label className="block text-sm text-muted-foreground mb-2">
                  {selectedDate < todayKey ? '시간 선택 (통계 데이터 제공)' : '시간 선택 (예측 데이터 제공)'}
                </label>
                <select
                  value={selectedTime5Min}
                  onChange={(e) => {
                    setSelectedTime5Min(e.target.value);
                    setIsTimeSelectorOpen(false);
                  }}
                  className="w-full p-3 bg-background border border-border rounded-lg text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="select-time-5min"
                >
                  {TIME_OPTIONS_5MIN.map((time) => (
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
                waitingData={waitingData || []}
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

      <ChartsPanelTrigger onClick={() => setIsChartsOpen(true)} />
      <ChartsPanel isOpen={isChartsOpen} onClose={() => setIsChartsOpen(false)} selectedDate={selectedDate} />
      {isToday && <BottomTimePanel />}
    </div>
  );
}
