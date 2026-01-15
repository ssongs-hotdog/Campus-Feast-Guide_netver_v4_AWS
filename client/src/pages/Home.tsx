import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimeControls } from '@/components/TimeControls';
import { RestaurantSection } from '@/components/RestaurantSection';
import { useTimeContext } from '@/lib/timeContext';
import { useTicketContext } from '@/lib/ticketContext';
import { RESTAURANTS, formatDate, type WaitingData, type MenuData } from '@shared/types';
import { useLocation } from 'wouter';

export default function Home() {
  const [, setLocation] = useLocation();
  const { timeState, setAvailableTimestamps } = useTimeContext();
  const { ticket } = useTicketContext();

  const { data: menuData } = useQuery<MenuData>({
    queryKey: ['/api/menu'],
  });

  const { data: timestampsData } = useQuery<{ timestamps: string[] }>({
    queryKey: ['/api/waiting/timestamps'],
  });

  useEffect(() => {
    if (timestampsData?.timestamps) {
      setAvailableTimestamps(timestampsData.timestamps);
    }
  }, [timestampsData, setAvailableTimestamps]);

  const formattedDisplayTime = useMemo(() => {
    const d = timeState.displayTime;
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [timeState.displayTime]);

  const { data: waitingData, isLoading: isWaitingLoading } = useQuery<WaitingData[]>({
    queryKey: ['/api/waiting', formattedDisplayTime],
    queryFn: async () => {
      const res = await fetch(`/api/waiting?time=${encodeURIComponent(formattedDisplayTime)}`);
      if (!res.ok) throw new Error('Failed to fetch waiting data');
      return res.json();
    },
    enabled: !!timestampsData?.timestamps?.length,
  });

  const displayDate = formatDate(timeState.displayTime);

  const hasActiveTicket = ticket && (ticket.status === 'stored' || ticket.status === 'active');

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button variant="ghost" size="icon" className="text-muted-foreground" data-testid="button-prev-date">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-base font-semibold text-foreground" data-testid="text-date">
            {displayDate}
          </h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground" data-testid="button-next-date">
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
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        <TimeControls />

        {!timestampsData?.timestamps?.length ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">
              데이터 파일을 /data/ 에 추가하세요
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              waiting_1min_KST_2026-01-15.csv
            </p>
          </div>
        ) : isWaitingLoading ? (
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
            {RESTAURANTS.map((restaurant) => (
              <RestaurantSection
                key={restaurant.id}
                restaurant={restaurant}
                menus={menuData?.[restaurant.id] || {}}
                waitingData={waitingData || []}
              />
            ))}
          </>
        )}
      </main>

      <footer className="border-t border-border py-4 mt-8">
        <p className="text-center text-xs text-muted-foreground">
          H-Eat PoC - 한양대학교 학생식당 혼잡도 모니터링
        </p>
      </footer>
    </div>
  );
}
