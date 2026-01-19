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
 * - When menu data is missing, shows "데이터 없음" for menu name
 * - When waiting data is missing, shows "-" for wait time and "미제공" for congestion
 * - The page always renders the same structure even without data
 */
import { useRoute, useLocation, useSearch } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CongestionBar } from '@/components/CongestionBar';
import { useTicketContext } from '@/lib/ticketContext';
import { useTimeContext } from '@/lib/timeContext';
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
import { getMenus, getAvailableTimestamps, getWaitTimes } from '@/lib/data/dataProvider';

export default function CornerDetail() {
  const [matchNew, paramsNew] = useRoute('/d/:dayKey/restaurant/:restaurantId/corner/:cornerId');
  const [matchOld, paramsOld] = useRoute('/restaurant/:restaurantId/corner/:cornerId');
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { createTicket, ticket } = useTicketContext();
  const { todayKey } = useTimeContext();

  const params = matchNew ? paramsNew : paramsOld;
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

  const { data: menuData } = useQuery<MenuData>({
    queryKey: ['/api/menu', effectiveDate],
    queryFn: async () => {
      const result = await getMenus(effectiveDate);
      if (result.error) throw new Error(result.error);
      return result.data as MenuData | null;
    },
  });

  const { data: timestampsData } = useQuery<{ timestamps: string[] }>({
    queryKey: ['/api/waiting/timestamps', effectiveDate],
    queryFn: async () => {
      const result = await getAvailableTimestamps(effectiveDate);
      if (result.error) throw new Error(result.error);
      return { timestamps: result.data || [] };
    },
    enabled: isToday && !timestampParam,
  });

  const effectiveTimestamp = (() => {
    if (timestampParam) return timestampParam;
    if (!isToday) return '';
    if (!timestampsData?.timestamps?.length) return '';
    return timestampsData.timestamps[0];
  })();

  const { data: waitingData } = useQuery<WaitingData[]>({
    queryKey: isToday 
      ? ['/api/waiting', effectiveDate, effectiveTimestamp]
      : ['/api/waiting', effectiveDate, time5minParam || '11:00', '5min'],
    queryFn: async () => {
      if (isToday) {
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
    enabled: isToday ? !!effectiveTimestamp : true,
    staleTime: 0,
    refetchInterval: isToday ? 30000 : false,
    refetchIntervalInBackground: false,
  });

  const menu = menuData?.[restaurantId]?.[cornerId];
  const cornerWaiting = waitingData?.find(
    (w) => w.restaurantId === restaurantId && w.cornerId === cornerId
  );

  // Check data availability
  const hasMenuData = !!menu;
  const hasWaitingData = !!cornerWaiting;
  
  const estWait = cornerWaiting?.est_wait_time_min;
  const queueLen = cornerWaiting?.queue_len;
  const level = hasWaitingData && estWait !== undefined ? getCongestionLevel(estWait) : null;
  
  const loadedTimestamp = isToday && waitingData?.[0]?.timestamp 
    ? formatTime(new Date(waitingData[0].timestamp))
    : !isToday ? (time5minParam || '11:00') : null;

  const handlePaymentForVariant = (variantMenuName: string) => {
    if (!menu) return;
    createTicket(restaurantId, cornerId, variantMenuName, menu.priceWon);
    setLocation('/ticket');
  };

  const handlePayment = () => {
    if (!menu) return;
    createTicket(restaurantId, cornerId, menu.mainMenuName, menu.priceWon);
    setLocation('/ticket');
  };

  const handleBack = () => {
    setLocation(`/d/${effectiveDate}`);
  };

  const hasExistingTicket = ticket && (ticket.status === 'stored' || ticket.status === 'active');

  // Get display names - use data if available, otherwise use placeholders
  const restaurantName = restaurant?.name || '식당';
  const cornerDisplayName = menu?.cornerDisplayName || CORNER_DISPLAY_NAMES[cornerId] || cornerId;
  const menuName = hasMenuData ? menu.mainMenuName : '데이터 없음';
  const price = hasMenuData ? menu.priceWon : null;
  const menuItems = hasMenuData ? menu.items : [];

  // Get variants for breakfast_1000 corner (only use when real variants exist in data)
  const isBreakfast = isBreakfastCorner(cornerId);
  const hasVariants = isBreakfast && hasMenuData && hasRealVariants(menu);
  const variants = hasVariants ? getMenuVariants(menu) : [];

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
        <Card className="p-4 mb-4" data-testid="card-waiting-info">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">예상 대기시간</p>
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
    </div>
  );
}
