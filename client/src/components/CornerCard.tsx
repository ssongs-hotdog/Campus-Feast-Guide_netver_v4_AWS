/**
 * CornerCard.tsx - Menu Corner Card Component
 * 
 * Purpose: Displays a single menu corner card with congestion information.
 * When clicked, navigates to the detail page with the correct date in the URL.
 * 
 * Props:
 * - menu: The menu item data for this corner
 * - waitingData: Optional waiting/congestion data for this corner
 * - dayKey: The current date being viewed (passed from parent)
 */
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CongestionBar } from './CongestionBar';
import { useTimeContext } from '@/lib/timeContext';
import type { MenuItem, WaitingData } from '@shared/types';
import type { DayKey } from '@/lib/dateUtils';

interface CornerCardProps {
  menu: MenuItem;
  waitingData?: WaitingData;
  dayKey: DayKey;
}

export function CornerCard({ menu, waitingData, dayKey }: CornerCardProps) {
  const [, setLocation] = useLocation();
  const { availableTimestamps, timeState, selectedTime5Min, todayKey } = useTimeContext();
  const estWait = waitingData?.est_wait_time_min ?? 0;
  
  const isToday = dayKey === todayKey;

  const handleClick = () => {
    const baseUrl = `/d/${dayKey}/restaurant/${menu.restaurantId}/corner/${menu.cornerId}`;
    const params = new URLSearchParams();
    
    if (!isToday) {
      params.set('time5min', selectedTime5Min);
    } else if (availableTimestamps.length > 0) {
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
      params.set('t', closestTs);
    }
    
    const queryString = params.toString();
    setLocation(queryString ? `${baseUrl}?${queryString}` : baseUrl);
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
        예상 대기시간: <span className="font-medium text-foreground transition-opacity duration-150">{estWait}분</span>
      </p>
    </Card>
  );
}
