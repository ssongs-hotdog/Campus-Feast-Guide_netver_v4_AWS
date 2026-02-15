/**
 * HomeCornerDetail.tsx - Menu Detail Page for Home Tab
 * 
 * Purpose: Displays detailed information about a specific menu corner for the Home tab.
 * Optimized for the Home tab context.
 */
import { useMemo, useState } from 'react';
import { useRoute, useLocation, useSearch } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CongestionBar } from '@/components/CongestionBar';
import { WaitTimeHistogram } from '@/components/WaitTimeHistogram';
import { useTicketContext } from '@/lib/ticketContext';
import { useTimeContext } from '@/lib/timeContext';
import { PurchaseSheet } from '@/components/ticket/PurchaseSheet';
import {
    RESTAURANTS,
    formatPrice,
    formatTime,
    getCongestionLevel,
    CONGESTION_LABELS,
    CONGESTION_COLORS,
    getMenuVariants,
    isBreakfastCorner,
    hasRealVariants,
    type WaitingData,
    type MenuData,
    type MenuItem,
} from '@shared/types';
import { isValidDayKey, type DayKey } from '@/lib/dateUtils';
import { CORNER_DISPLAY_NAMES } from '@shared/cornerDisplayNames';
// Import schedule logic directly from shared domain
import { CORNER_SCHEDULES, getServiceDayType, type TimeWindow } from '@shared/domain/schedule';
import { getMenus, getAvailableTimestamps, getWaitTimes, getLatestWaitTimes, getConfig, getAllWaitTimes } from '@/lib/data/dataProvider';

export default function HomeCornerDetail() {
    // Only match Home tab routes
    const [matchNew, paramsNew] = useRoute('/d/:dayKey/restaurant/:restaurantId/corner/:cornerId');
    const [matchOld, paramsOld] = useRoute('/restaurant/:restaurantId/corner/:cornerId');

    const [location, setLocation] = useLocation();
    const searchString = useSearch();
    const { tickets } = useTicketContext();
    const { todayKey } = useTimeContext();

    // -- Payment Sheet State --
    const [isPurchaseSheetOpen, setIsPurchaseSheetOpen] = useState(false);
    const [purchaseTargetMenu, setPurchaseTargetMenu] = useState<MenuItem | null>(null);

    const params = matchNew ? paramsNew : paramsOld;
    const restaurantId = params?.restaurantId || '';
    const cornerId = params?.cornerId || '';

    const searchParams = new URLSearchParams(searchString);
    const timestampParam = searchParams.get('t') || '';
    const time5minParam = searchParams.get('time5min') || '';

    // Derive date from URL path, query param, or fallback to today
    const dayKeyFromPath: DayKey = (matchNew && paramsNew?.dayKey) ? paramsNew.dayKey : '';
    const rawDate = dayKeyFromPath || todayKey;
    const effectiveDate: DayKey = isValidDayKey(rawDate) ? rawDate : todayKey;

    const isToday = effectiveDate === todayKey;

    const restaurant = RESTAURANTS.find((r) => r.id === restaurantId);

    const { data: menuData } = useQuery<MenuData | null>({
        queryKey: ['/api/menu', effectiveDate],
        queryFn: async () => {
            const result = await getMenus(effectiveDate);
            if (result.error) throw new Error(result.error);
            if (!result.data) return null; // Ensure null is returned if undefined
            return result.data as MenuData;
        },
    });

    const { data: configData } = useQuery<{ useDbWaiting: boolean; today: string }>({
        queryKey: ['/api/config'],
        queryFn: async () => {
            const result = await getConfig();
            if (result.error) throw new Error(result.error);
            return result.data || { useDbWaiting: false, today: todayKey };
        },
        staleTime: 60000,
    });

    const useDbWaiting = configData?.useDbWaiting ?? false;
    const useLiveEndpoint = isToday && useDbWaiting;

    const { data: timestampsData } = useQuery<{ timestamps: string[] }>({
        queryKey: ['/api/waiting/timestamps', effectiveDate],
        queryFn: async () => {
            const result = await getAvailableTimestamps(effectiveDate);
            if (result.error) throw new Error(result.error);
            return { timestamps: result.data || [] };
        },
        enabled: isToday && !timestampParam && !useLiveEndpoint,
    });

    const effectiveTimestamp = (() => {
        if (timestampParam) return timestampParam;
        if (!isToday) return '';
        if (useLiveEndpoint) return '';
        if (!timestampsData?.timestamps?.length) return '';
        return timestampsData.timestamps[0];
    })();

    const { data: waitingData } = useQuery<WaitingData[]>({
        queryKey: useLiveEndpoint
            ? ['/api/waiting/latest', effectiveDate]
            : isToday
                ? ['/api/waiting', effectiveDate, effectiveTimestamp]
                : ['/api/waiting', effectiveDate, time5minParam || '11:00', '5min'],
        queryFn: async () => {
            if (useLiveEndpoint) {
                const result = await getLatestWaitTimes(effectiveDate);
                if (result.error) throw new Error(result.error);
                return result.data || [];
            } else if (isToday) {
                if (!effectiveTimestamp) return [];
                const result = await getWaitTimes(effectiveDate, effectiveTimestamp);
                if (result.error) throw new Error(result.error);
                return result.data || [];
            } else {
                const timeVal = time5minParam || '11:00';
                const result = await getWaitTimes(effectiveDate, timeVal, '5min');
                if (result.error) throw new Error(result.error);
                return result.data || [];
            }
        },
        enabled: useLiveEndpoint || (isToday ? !!effectiveTimestamp : true),
        staleTime: useLiveEndpoint ? 0 : 60000,
        refetchInterval: useLiveEndpoint ? 30000 : false,
        refetchIntervalInBackground: false,
    });

    const menu = menuData?.[restaurantId]?.[cornerId];

    const cornerWaiting = useMemo(() => {
        if (!waitingData || waitingData.length === 0) return undefined;

        const relevantItems = waitingData.filter(
            (w) => w.restaurantId === restaurantId && w.cornerId === cornerId
        );

        if (relevantItems.length === 0) return undefined;

        if (isToday) return relevantItems[0];

        // For past/future with 5-min bucket, find closest to 'time5minParam'
        if (time5minParam) {
            const [targetH, targetM] = time5minParam.split(':').map(Number);
            const targetMinutes = targetH * 60 + targetM;

            let bestItem = relevantItems[0];
            let minDiff = Infinity;

            for (const item of relevantItems) {
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
            return bestItem;
        }

        // Fallback
        return relevantItems[0];
    }, [waitingData, restaurantId, cornerId, isToday, time5minParam]);

    // Check data availability
    const hasMenuData = !!menu;
    const hasWaitingData = !!cornerWaiting;

    // Phase 2 Update: use camelCase from API
    const estWait = cornerWaiting?.estWaitTimeMin;
    const queueLen = cornerWaiting?.queueLen;
    const level = hasWaitingData && estWait !== undefined ? getCongestionLevel(estWait) : null;

    const loadedTimestamp = isToday && waitingData?.[0]?.timestamp
        ? formatTime(new Date(waitingData[0].timestamp))
        : !isToday ? (time5minParam || '11:00') : null;

    const handlePaymentForVariant = (variantMenuName: string) => {
        if (!menu) return;
        // Create a temporary MenuItem for the variant to pass to the sheet
        const variantItem: MenuItem = {
            ...menu,
            mainMenuName: variantMenuName
        };
        setPurchaseTargetMenu(variantItem);
        setIsPurchaseSheetOpen(true);
    };

    const handlePayment = () => {
        if (!menu) return;
        setPurchaseTargetMenu(menu);
        setIsPurchaseSheetOpen(true);
    };

    const handleBack = () => {
        // Return to Home view
        setLocation(`/d/${effectiveDate}`);
    };

    const hasExistingTicket = tickets.some(t =>
        t.restaurantId === restaurantId &&
        t.cornerId === cornerId &&
        (t.status === 'stored' || t.status === 'active')
    );

    // Get display names
    const restaurantName = restaurant?.name || '식당';
    const cornerDisplayName = menu?.cornerDisplayName || CORNER_DISPLAY_NAMES[cornerId] || cornerId;
    const menuName = hasMenuData ? menu.mainMenuName : '휴무입니다🏖️';
    const price = hasMenuData ? menu.priceWon : null;
    const menuItems = hasMenuData ? menu.items : [];

    const { data: allWaitingData } = useQuery<WaitingData[]>({
        queryKey: ['/api/waiting/all', effectiveDate],
        queryFn: async () => {
            const result = await getAllWaitTimes(effectiveDate);
            return result as WaitingData[];
        },
        // Cache for 5 minutes
        staleTime: 5 * 60 * 1000,
    });

    const isBreakfast = isBreakfastCorner(cornerId);
    const hasVariants = isBreakfast && hasMenuData && hasRealVariants(menu);
    const variants = hasVariants ? getMenuVariants(menu) : [];

    // Transform fetched data for histogram
    const forecastData = useMemo(() => {
        if (!allWaitingData) return [];

        return allWaitingData
            .filter((item) => item.restaurantId === restaurantId && item.cornerId === cornerId)
            .map((item) => ({
                time: formatTime(new Date(item.timestamp)), // HH:MM
                waitMinutes: item.estWaitTimeMin,
            }))
            .sort((a, b) => a.time.localeCompare(b.time));
    }, [allWaitingData, restaurantId, cornerId]);

    // Dynamically calculate operating hours based on schedule
    const operatingHours = useMemo(() => {
        // Default fallback
        const defaultHours = { openTime: '11:00', closeTime: '14:30' };

        const schedule = CORNER_SCHEDULES[restaurantId]?.[cornerId];
        if (!schedule) return defaultHours;

        const dayType = getServiceDayType(effectiveDate);
        let windows: TimeWindow[] = [];

        if (dayType === 'WEEKDAY') {
            windows = schedule.weekday || [];
        } else if (dayType === 'SATURDAY') {
            windows = schedule.saturday || [];
        } else if (dayType === 'SUNDAY') {
            windows = schedule.sunday || [];
        }

        if (windows.length === 0) return defaultHours;

        let minStart = windows[0].start;
        let maxEnd = windows[0].end;

        for (const w of windows) {
            if (w.start < minStart) minStart = w.start;
            if (w.end > maxEnd) maxEnd = w.end;
        }

        return { openTime: minStart, closeTime: maxEnd };
    }, [restaurantId, cornerId, effectiveDate]);

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
                <div className="flex items-center gap-3 max-w-lg mx-auto">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBack}
                        data-testid="button-back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-base font-semibold text-foreground">{restaurantName}</h1>
                        <p className="text-xs text-muted-foreground">{cornerDisplayName}</p>
                    </div>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-4">
                {loadedTimestamp && (
                    <div className="text-xs text-muted-foreground mb-3 text-center" data-testid="text-loaded-timestamp-detail">
                        데이터 시각: {loadedTimestamp}
                    </div>
                )}


                {/* Current Wait Time Info */}
                <Card className="p-4 mb-4" data-testid="card-current-waiting">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-sm text-muted-foreground">현재 대기시간</p>
                            <p className={`text-2xl font-bold ${hasWaitingData ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {hasWaitingData ? `${estWait}분` : '-'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span className="text-sm" data-testid="text-queue-len">
                                대기 {hasWaitingData ? `${queueLen}명` : '-'}
                            </span>
                        </div>
                    </div>
                    <div className="mb-2">
                        <CongestionBar estWaitTime={estWait} size="md" noData={!hasWaitingData} />
                    </div>
                    {hasWaitingData && level ? (
                        <Badge
                            variant="secondary"
                            className="mt-1"
                            style={{
                                backgroundColor: `${CONGESTION_COLORS[level]}20`,
                                color: CONGESTION_COLORS[level],
                                borderColor: CONGESTION_COLORS[level],
                            }}
                        >
                            {CONGESTION_LABELS[level]}
                        </Badge>
                    ) : (
                        <Badge
                            variant="secondary"
                            className="mt-1 text-muted-foreground"
                        >
                            미제공
                        </Badge>
                    )}
                </Card>

                {hasVariants ? (
                    <div className="space-y-4 mb-6">
                        {variants.map((variant, variantIdx) => (
                            <Card key={variantIdx} className="p-4" data-testid={`card-menu-info-variant-${variantIdx}`}>
                                <div className="flex gap-4">
                                    <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                                        <span className="text-muted-foreground text-sm">사진</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-lg font-bold mb-1 text-foreground" data-testid={`text-menu-name-variant-${variantIdx}`}>
                                            {variant.mainMenuName}
                                        </h2>
                                        <p className="text-xl font-semibold mb-2 text-primary" data-testid={`text-price-variant-${variantIdx}`}>
                                            {price !== null ? formatPrice(price) : '-'}
                                        </p>
                                        {variant.items.length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-xs text-muted-foreground mb-1">구성</p>
                                                <ul className="text-sm text-foreground space-y-0.5">
                                                    {variant.items.map((item, idx) => (
                                                        <li key={idx} className="flex items-start gap-1">
                                                            <span className="text-muted-foreground">•</span>
                                                            <span>{item}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
                                    <span className="text-sm text-muted-foreground" data-testid={`text-remaining-meals-${variantIdx}`}>
                                        잔여 식수: --명
                                    </span>
                                    {isToday && (
                                        hasExistingTicket ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setLocation('/ticket')}
                                                data-testid={`button-view-ticket-variant-${variantIdx}`}
                                            >
                                                주문권 확인
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={() => handlePaymentForVariant(variant.mainMenuName)}
                                                data-testid={`button-payment-variant-${variantIdx}`}
                                            >
                                                결제하기
                                            </Button>
                                        )
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <>
                        <Card className="p-4 mb-6" data-testid="card-menu-info">
                            <div className="flex gap-4">
                                <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-muted-foreground text-sm">사진</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className={`text-lg font-bold mb-1 ${hasMenuData ? 'text-foreground' : 'text-muted-foreground'}`} data-testid="text-menu-name">
                                        {menuName}
                                    </h2>
                                    <p className={`text-xl font-semibold mb-2 ${hasMenuData ? 'text-primary' : 'text-muted-foreground'}`} data-testid="text-price">
                                        {price !== null ? formatPrice(price) : '-'}
                                    </p>
                                    {menuItems.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-xs text-muted-foreground mb-1">구성</p>
                                            <ul className="text-sm text-foreground space-y-0.5">
                                                {menuItems.map((item, idx) => (
                                                    <li key={idx} className="flex items-start gap-1">
                                                        <span className="text-muted-foreground">•</span>
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {isToday && hasMenuData && (
                            hasExistingTicket ? (
                                <Button
                                    variant="outline"
                                    className="w-full h-12 text-base"
                                    onClick={() => setLocation('/ticket')}
                                    data-testid="button-view-ticket"
                                >
                                    주문권 확인하기
                                </Button>
                            ) : (
                                <Button
                                    className="w-full h-12 text-base"
                                    onClick={handlePayment}
                                    data-testid="button-payment"
                                >
                                    결제하기 (시뮬)
                                </Button>
                            )
                        )}
                    </>
                )}

                {/* Hourly Wait Time Histogram */}
                <Card className="p-4 mb-4" data-testid="card-waiting-info">
                    {hasMenuData ? (
                        <WaitTimeHistogram
                            operatingHours={operatingHours}
                            forecastData={forecastData}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-48 bg-muted/30 rounded-lg">
                            <p className="text-sm text-muted-foreground">휴무입니다 🏖️</p>
                        </div>
                    )}
                </Card>
            </main>
            <PurchaseSheet
                isOpen={isPurchaseSheetOpen}
                onClose={() => setIsPurchaseSheetOpen(false)}
                menu={purchaseTargetMenu}
            />
        </div>
    );
}
