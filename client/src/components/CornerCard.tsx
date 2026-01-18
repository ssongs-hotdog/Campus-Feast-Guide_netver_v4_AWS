/**
 * CornerCard.tsx - Menu Corner Card Component
 * 
 * Purpose: Displays a single menu corner card with congestion information.
 * When clicked, navigates to the detail page with the correct date in the URL.
 * 
 * Props:
 * - menu: The menu item data for this corner (optional - shows placeholder if missing)
 * - waitingData: Optional waiting/congestion data for this corner
 * - dayKey: The current date being viewed (passed from parent)
 * - restaurantId: The restaurant ID (needed when menu is missing)
 * - cornerId: The corner ID (needed when menu is missing)
 * - cornerDisplayName: Display name for the corner (needed when menu is missing)
 * - isActive: Whether the corner is currently operating (green dot = active, gray = inactive)
 * 
 * Placeholder behavior:
 * - When menu is missing, shows "데이터 없음" for menu name
 * - When waiting data is missing, shows "-" for wait time and "미제공" for congestion
 * 
 * Status indicator:
 * - Green dot: Corner is currently active/operating
 * - Gray dot: Corner is inactive (outside operating hours or break time)
 */
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CongestionBar } from './CongestionBar';
import { useTimeContext } from '@/lib/timeContext';
import type { MenuItem, WaitingData } from '@shared/types';
import { getMenuVariants, isBreakfastCorner, hasRealVariants } from '@shared/types';
import type { DayKey } from '@/lib/dateUtils';

interface CornerCardProps {
  menu?: MenuItem | null;
  waitingData?: WaitingData;
  dayKey: DayKey;
  restaurantId: string;
  cornerId: string;
  cornerDisplayName: string;
  isActive?: boolean;  // Whether corner is currently operating
}

export function CornerCard({ 
  menu, 
  waitingData, 
  dayKey, 
  restaurantId,
  cornerId,
  cornerDisplayName,
  isActive = false,
}: CornerCardProps) {
  const [, setLocation] = useLocation();
  const { availableTimestamps, timeState, selectedTime5Min, todayKey } = useTimeContext();
  
  // Check if we have actual data
  const hasMenuData = !!menu;
  const hasWaitingData = !!waitingData;
  const estWait = waitingData?.est_wait_time_min;
  
  const isToday = dayKey === todayKey;

  // Get display name for menu - handle breakfast variants
  const getMenuDisplayName = (): string => {
    if (!hasMenuData) return '데이터 없음';
    if (isBreakfastCorner(cornerId) && hasRealVariants(menu)) {
      const variants = getMenuVariants(menu);
      if (variants.length >= 2) {
        return `${variants[0].mainMenuName}, ${variants[1].mainMenuName}`;
      } else if (variants.length === 1) {
        return variants[0].mainMenuName;
      }
    }
    return menu!.mainMenuName;
  };
  const menuDisplayName = getMenuDisplayName();

  const handleClick = () => {
    const baseUrl = `/d/${dayKey}/restaurant/${restaurantId}/corner/${cornerId}`;
    const params = new URLSearchParams();
    
    if (!isToday && selectedTime5Min) {
      params.set('time5min', selectedTime5Min);
    } else if (isToday && availableTimestamps.length > 0) {
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
      data-testid={`card-corner-${cornerId}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Badge 
            variant="secondary" 
            className="mb-2 text-xs font-medium px-2 py-0.5 flex items-center gap-1.5 w-fit"
            data-testid={`badge-corner-${cornerId}`}
          >
            <span 
              className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}
              data-testid={`status-${cornerId}`}
              aria-label={isActive ? '운영 중' : '운영 종료'}
            />
            {menu?.cornerDisplayName || cornerDisplayName}
          </Badge>
          <h3 
            className={`text-lg font-semibold truncate ${hasMenuData ? 'text-foreground' : 'text-muted-foreground'}`}
            data-testid={`text-menu-${cornerId}`}
          >
            {menuDisplayName}
          </h3>
        </div>
        <div className="w-24 flex-shrink-0">
          <CongestionBar 
            estWaitTime={hasWaitingData ? estWait : undefined} 
            size="md" 
            noData={!hasWaitingData}
          />
        </div>
      </div>
      <p 
        className="mt-3 text-sm text-muted-foreground"
        data-testid={`text-wait-${cornerId}`}
      >
        예상 대기시간: {hasWaitingData ? (
          <span className="font-medium text-foreground transition-opacity duration-150">{estWait}분</span>
        ) : (
          <span className="font-medium text-muted-foreground">-</span>
        )}
      </p>
    </Card>
  );
}
