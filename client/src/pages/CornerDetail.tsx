/**
 * CornerDetail.tsx - Menu Detail Page
 * 
 * Purpose: Displays detailed information about a specific menu corner,
 * including waiting time, menu details, and payment option (for today only).
 * 
 * URL format: /d/YYYY-MM-DD/restaurant/:restaurantId/corner/:cornerId
 * Query params:
 * - t: ISO timestamp for today's data
 * - time5min: HH:MM for historical/predicted data
 * 
 * The date is now derived from the URL path, making the page fully URL-driven.
 * 
 * Placeholder behavior:
 * - When menu data is missing, shows "휴무입니다🏖️" for menu name
 * - When waiting data is missing, shows "-" for wait time and "미제공" for congestion
 * - The page always renders the same structure even without data
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
  type MenuVariant,
  type MenuItem,
} from '@shared/types';
import { isValidDayKey, type DayKey } from '@/lib/dateUtils';
import { CORNER_DISPLAY_NAMES } from '@shared/cornerDisplayNames';
import { getMenus, getAvailableTimestamps, getWaitTimes, getLatestWaitTimes, getConfig } from '@/lib/data/dataProvider';

export default function CornerDetail() {
  const [matchNew, paramsNew] = useRoute('/d/:dayKey/restaurant/:restaurantId/corner/:cornerId');
  const [matchOld, paramsOld] = useRoute('/restaurant/:restaurantId/corner/:cornerId');
  const [matchMenu, paramsMenu] = useRoute('/menu/detail/:restaurantId/:cornerId');
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const { tickets } = useTicketContext();
  const { todayKey } = useTimeContext();

  // -- Payment Sheet State --
  const [isPurchaseSheetOpen, setIsPurchaseSheetOpen] = useState(false);
  const [purchaseTargetMenu, setPurchaseTargetMenu] = useState<MenuItem | null>(null);

  const params = matchNew ? paramsNew : (matchOld ? paramsOld : paramsMenu);
  const restaurantId = params?.restaurantId || '';
  const cornerId = params?.cornerId || '';

  const searchParams = new URLSearchParams(searchString);
  const timestampParam = searchParams.get('t') || '';
  const dateParam = searchParams.get('date') || '';
  const time5minParam = searchParams.get('time5min') || '';

  // Derive date from URL path, query param, or fallback to today
  const dayKeyFromPath: DayKey = (matchNew && paramsNew?.dayKey) ? paramsNew.dayKey : '';
  const rawDate = dayKeyFromPath || dateParam || todayKey;
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

  // Fix for Main/Detail Discrepancy:
  // Instead of just finding the first match (.find), we need to find the *closest* match 
  // to the target time if we are in a historical/future view.
  const cornerWaiting = useMemo(() => {
    if (!waitingData || waitingData.length === 0) return undefined;

    const relevantItems = waitingData.filter(
      (w) => w.restaurantId === restaurantId && w.cornerId === cornerId
    );

    if (relevantItems.length === 0) return undefined;

    // If live/today, usually we just take the first/only one as the API returns latest/specific
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
    // Detect if we came from Menu tab by checking current route
    if (matchMenu) {
      // Return to menu with the selected date preserved
      setLocation(`/menu?date=${effectiveDate}`);
    } else {
      setLocation(`/d/${effectiveDate}`);
    }
  };

  const hasExistingTicket = tickets.some(t =>
    t.restaurantId === restaurantId &&
    t.cornerId === cornerId &&
    (t.status === 'stored' || t.status === 'active')
  );

  // Get display names - use data if available, otherwise use placeholders
  const restaurantName = restaurant?.name || '식당';
  const cornerDisplayName = menu?.cornerDisplayName || CORNER_DISPLAY_NAMES[cornerId] || cornerId;
  const menuName = hasMenuData ? menu.mainMenuName : '휴무입니다🏖️';
  const price = hasMenuData ? menu.priceWon : null;
  const menuItems = hasMenuData ? menu.items : [];

  // Get variants for breakfast_1000 corner (only use when real variants exist in data)
  const isBreakfast = isBreakfastCorner(cornerId);
  const hasVariants = isBreakfast && hasMenuData && hasRealVariants(menu);
  const variants = hasVariants ? getMenuVariants(menu) : [];

  // Sample forecast data for histogram (TODO: Replace with actual API data)
  const forecastData = [
    { time: '09:00', waitMinutes: 0 },
    { time: '09:30', waitMinutes: 0 },
    { time: '10:00', waitMinutes: 2 },
    { time: '10:30', waitMinutes: 5 },
    { time: '11:00', waitMinutes: 10 },
    { time: '11:30', waitMinutes: 15 },
    { time: '12:00', waitMinutes: 20 },
    { time: '12:30', waitMinutes: 18 },
    { time: '13:00', waitMinutes: 12 },
    { time: '13:30', waitMinutes: 8 },
    { time: '14:00', waitMinutes: 5 },
    { time: '14:30', waitMinutes: 2 },
    { time: '15:00', waitMinutes: 0 },
    { time: '15:30', waitMinutes: 0 },
    { time: '16:00', waitMinutes: 3 },
    { time: '16:30', waitMinutes: 8 },
    { time: '17:00', waitMinutes: 12 },
    { time: '17:30', waitMinutes: 16 },
    { time: '18:00', waitMinutes: 14 },
    { time: '18:30', waitMinutes: 10 },
    { time: '19:00', waitMinutes: 5 },
  ];

  // Get operating hours from corner schedule (sample data for now)
  // TODO: Get actual operating hours from corner data
  const operatingHours = { openTime: '11:00', closeTime: '14:30' };

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

        {/* Current Wait Time Info (kept for reference) */}
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
      </main>
      <PurchaseSheet
        isOpen={isPurchaseSheetOpen}
        onClose={() => setIsPurchaseSheetOpen(false)}
        menu={purchaseTargetMenu}
      />
    </div>
  );
}
