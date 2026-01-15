import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CongestionBar } from './CongestionBar';
import { useTimeContext } from '@/lib/timeContext';
import type { MenuItem, WaitingData } from '@shared/types';

interface CornerCardProps {
  menu: MenuItem;
  waitingData?: WaitingData;
}

export function CornerCard({ menu, waitingData }: CornerCardProps) {
  const [, setLocation] = useLocation();
  const { availableTimestamps, timeState } = useTimeContext();
  const estWait = waitingData?.est_wait_time_min ?? 0;

  const handleClick = () => {
    if (availableTimestamps.length === 0) {
      setLocation(`/restaurant/${menu.restaurantId}/corner/${menu.cornerId}`);
      return;
    }
    
    const targetTime = timeState.displayTime.getTime();
    let closestTs = availableTimestamps[0];
    let minDiff = Math.abs(new Date(availableTimestamps[0]).getTime() - targetTime);
    
    for (const ts of availableTimestamps) {
      const diff = Math.abs(new Date(ts).getTime() - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestTs = ts;
      }
    }
    setLocation(`/restaurant/${menu.restaurantId}/corner/${menu.cornerId}?t=${encodeURIComponent(closestTs)}`);
  };

  return (
    <Card
      className="p-4 cursor-pointer hover-elevate active-elevate-2 transition-all duration-150"
      onClick={handleClick}
      data-testid={`card-corner-${menu.cornerId}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Badge 
            variant="secondary" 
            className="mb-2 text-xs font-medium px-2 py-0.5"
            data-testid={`badge-corner-${menu.cornerId}`}
          >
            {menu.cornerDisplayName}
          </Badge>
          <h3 
            className="text-lg font-semibold text-foreground truncate"
            data-testid={`text-menu-${menu.cornerId}`}
          >
            {menu.mainMenuName}
          </h3>
        </div>
        <div className="w-24 flex-shrink-0">
          <CongestionBar estWaitTime={estWait} size="md" />
        </div>
      </div>
      <p 
        className="mt-3 text-sm text-muted-foreground"
        data-testid={`text-wait-${menu.cornerId}`}
      >
        예상 대기시간: <span className="font-medium text-foreground">{estWait}분</span>
      </p>
    </Card>
  );
}
