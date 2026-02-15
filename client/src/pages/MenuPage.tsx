/**
 * MenuPage.tsx - Monthly Menu Page
 * 
 * Purpose: Displays restaurant menus with monthly date selection capability.
 * Initially copied from Home.tsx to maintain identical UI/UX.
 * 
 * Key features:
 * - Shows today's menu by default
 * - Will support monthly date navigation (future enhancement)
 * - Shows menu data for each restaurant corner
 * - Displays real-time or historical congestion data
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import { ChevronLeft, ChevronRight, Ticket, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MenuRestaurantSection } from '@/components/menu/MenuRestaurantSection';
import { RestaurantSelector } from '@/components/RestaurantSelector';
import { DatePickerModal } from '@/components/DatePickerModal';
import { WeeklyCalendar } from '@/components/menu/WeeklyCalendar';
import { useTimeContext } from '@/lib/timeContext';
import { useTicketContext } from '@/lib/ticketContext';
import { RESTAURANTS, formatTime, type WaitingData, type MenuData } from '@shared/types';
import { addDays, formatDayKeyForDisplay, isValidDayKey, type DayKey } from '@/lib/dateUtils';
import { getMenus, getWaitTimes, getAvailableTimestamps, getLatestWaitTimes, getConfig } from '@/lib/data/dataProvider';
import { format } from 'date-fns';
import { BannerCarousel } from '@/components/BannerCarousel';

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

// HMR Trigger v2
export default function MenuPage() {
    const [, setLocation] = useLocation();
    const searchString = useSearch();

    const {
        timeState,
        setAvailableTimestamps,
        selectedTime5Min,
        setSelectedTime5Min,
        todayKey,
    } = useTimeContext();
    const { tickets } = useTicketContext();
    const [isTimeSelectorOpen, setIsTimeSelectorOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('all');

    // Try to restore date from URL query parameter
    const searchParams = new URLSearchParams(searchString);
    const dateFromUrl = searchParams.get('date') || '';
    const initialDate = isValidDayKey(dateFromUrl) ? dateFromUrl : todayKey;

    // Menu page with date picker - defaults to today or URL param
    const [selectedDate, setSelectedDate] = useState<DayKey>(initialDate);
    const isToday = selectedDate === todayKey;

    const handleDateSelect = useCallback((date: DayKey) => {
        setSelectedDate(date);
    }, []);

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

    const processedWaitingData = useMemo(() => {
        if (!waitingData || waitingData.length === 0) return [];

        if (isToday) return waitingData;

        if (selectedTime5Min) {
            const targetTimeStr = selectedTime5Min;

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
    }, [waitingData, isToday, selectedTime5Min]);

    const displayDate = formatDayKeyForDisplay(selectedDate, todayKey);
    const hasActiveTicket = tickets.some(t => t.status === 'stored' || t.status === 'active');

    const loadedTimestamp = isToday && processedWaitingData?.[0]?.timestamp
        ? formatTime(new Date(processedWaitingData[0].timestamp))
        : (!isToday && selectedTime5Min) ? selectedTime5Min : null;

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
        if (isToday) {
            void scheduleRefreshKey;
            return getCurrentTimeKST();
        } else {
            return selectedTime5Min;
        }
    }, [isToday, selectedTime5Min, scheduleRefreshKey, getCurrentTimeKST]);

    useEffect(() => {
        if (!isToday) {
            setScheduleRefreshKey(0);
            return;
        }

        const interval = setInterval(() => {
            setScheduleRefreshKey(prev => prev + 1);
        }, 10 * 60 * 1000);

        return () => clearInterval(interval);
    }, [isToday]);

    return (
        <div className="min-h-screen bg-background pb-24">
            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
                <div className="max-w-lg mx-auto space-y-3">
                    {/* Ticket Button (if active) - Date Trigger Removed */}
                    {hasActiveTicket && (
                        <div className="flex justify-end">
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
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-4">

                {/* Weekly Calendar Strip */}
                <div className="mb-1">
                    <WeeklyCalendar
                        selectedDate={selectedDate}
                        onDateSelect={handleDateSelect}
                        onCalendarClick={() => setIsCalendarOpen(true)}
                    />
                </div>

                {/* Restaurant Category Filter Tabs */}
                <div className="mb-2 -mx-4">
                    <RestaurantSelector
                        restaurants={RESTAURANTS.map(r => ({ id: r.id, name: r.name }))}
                        selectedId={selectedRestaurantId}
                        onSelect={setSelectedRestaurantId}
                    />
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
                        {RESTAURANTS
                            .filter(restaurant => selectedRestaurantId === 'all' || restaurant.id === selectedRestaurantId)
                            .map((restaurant) => (
                                <MenuRestaurantSection
                                    key={restaurant.id}
                                    restaurant={restaurant}
                                    menus={menuData?.[restaurant.id] || {}}
                                    dayKey={selectedDate}
                                    referenceTime={referenceTime}
                                />
                            ))}
                    </>
                )}
            </main>

            {/* Date Picker Modal */}
            <DatePickerModal
                isOpen={isCalendarOpen}
                onClose={() => setIsCalendarOpen(false)}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
            />

            <footer className="border-t border-border py-4 mt-8">
                <p className="text-center text-xs text-muted-foreground">
                    HY-eat - 한양대학교 학생식당 혼잡도 모니터링
                </p>
            </footer>
        </div>
    );
}
