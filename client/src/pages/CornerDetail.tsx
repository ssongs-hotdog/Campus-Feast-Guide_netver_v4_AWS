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
  type WaitingData, 
  type MenuData 
} from '@shared/types';
import { isValidDayKey, type DayKey } from '@/lib/dateUtils';

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
      const res = await fetch(`/api/menu?date=${effectiveDate}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch menu data');
      }
      return res.json();
    },
  });

  const { data: timestampsData } = useQuery<{ timestamps: string[] }>({
    queryKey: ['/api/waiting/timestamps', effectiveDate],
    queryFn: async () => {
      const res = await fetch(`/api/waiting/timestamps?date=${effectiveDate}`);
      if (!res.ok) throw new Error('Failed to fetch timestamps');
      return res.json();
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
        const res = await fetch(`/api/waiting?date=${effectiveDate}&time=${encodeURIComponent(effectiveTimestamp)}`);
        if (!res.ok) throw new Error('Failed to fetch waiting data');
        return res.json();
      } else {
        const timeVal = time5minParam || '11:00';
        const res = await fetch(`/api/waiting?date=${effectiveDate}&time=${timeVal}&aggregate=5min`);
        if (!res.ok) throw new Error('Failed to fetch waiting data');
        return res.json();
      }
    },
    enabled: isToday ? !!effectiveTimestamp : true,
    staleTime: 0,
  });

  const menu = menuData?.[restaurantId]?.[cornerId];
  const cornerWaiting = waitingData?.find(
    (w) => w.restaurantId === restaurantId && w.cornerId === cornerId
  );

  const estWait = cornerWaiting?.est_wait_time_min ?? 0;
  const queueLen = cornerWaiting?.queue_len ?? 0;
  const level = getCongestionLevel(estWait);
  
  const loadedTimestamp = isToday && waitingData?.[0]?.timestamp 
    ? formatTime(new Date(waitingData[0].timestamp))
    : !isToday ? (time5minParam || '11:00') : null;

  const handlePayment = () => {
    if (!menu) return;
    createTicket(restaurantId, cornerId, menu.mainMenuName, menu.priceWon);
    setLocation('/ticket');
  };

  const handleBack = () => {
    setLocation(`/d/${effectiveDate}`);
  };

  const hasExistingTicket = ticket && (ticket.status === 'stored' || ticket.status === 'active');

  if (!menu || !restaurant) {
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
              <h1 className="text-base font-semibold text-foreground">메뉴 정보</h1>
            </div>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              메뉴를 찾을 수 없습니다
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              이 날짜의 메뉴 데이터가 아직 제공되지 않습니다
            </p>
          </div>
        </main>
      </div>
    );
  }

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
            <h1 className="text-base font-semibold text-foreground">{restaurant.name}</h1>
            <p className="text-xs text-muted-foreground">{menu.cornerDisplayName}</p>
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
              <p className="text-2xl font-bold text-foreground">{estWait}분</p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-sm" data-testid="text-queue-len">대기 {queueLen}명</span>
            </div>
          </div>
          <div className="mb-2">
            <CongestionBar estWaitTime={estWait} size="md" />
          </div>
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
        </Card>

        <Card className="p-4 mb-6" data-testid="card-menu-info">
          <div className="flex gap-4">
            <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-muted-foreground text-sm">사진</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground mb-1" data-testid="text-menu-name">
                {menu.mainMenuName}
              </h2>
              <p className="text-xl font-semibold text-primary mb-2" data-testid="text-price">
                {formatPrice(menu.priceWon)}
              </p>
              {menu.items.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">구성</p>
                  <ul className="text-sm text-foreground space-y-0.5">
                    {menu.items.map((item, idx) => (
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

        {isToday && (
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
      </main>
    </div>
  );
}
