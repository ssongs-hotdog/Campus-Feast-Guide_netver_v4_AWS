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
 * - When menu is missing, shows "휴무입니다🏖️" for menu name
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
import { useTicketContext } from '@/lib/ticketContext';
import { Star } from 'lucide-react';
import { useFavorites } from '@/lib/favoritesContext';
import {
  getMenuVariants,
  isBreakfastCorner,
  hasRealVariants,
  type MenuItem,
  type WaitingData
} from '@shared/types';
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
  const [location, setLocation] = useLocation();
  const { availableTimestamps, timeState, selectedTime5Min, todayKey } = useTimeContext();
  const { isFavorite, toggleFavorite } = useFavorites();

  const isFavorited = isFavorite(cornerId);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(cornerId);
  };

  // Check if we have actual data
  const hasMenuData = !!menu;
  const hasWaitingData = !!waitingData;
  // Use camelCase property
  const estWait = waitingData?.estWaitTimeMin;

  const isToday = dayKey === todayKey;

  // Get display name for menu - handle breakfast variants
  const getMenuDisplayName = (): string => {
    if (!hasMenuData) return '휴무입니다🏖️';
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
    // Detect if we're on the MenuPage by checking current location
    const isOnMenuPage = location.startsWith('/menu');

    if (isOnMenuPage) {
      // Menu tab navigation - use simplified route with date query param
      setLocation(`/menu/detail/${restaurantId}/${cornerId}?date=${dayKey}`);
    } else {
      // Home tab navigation - use date-based route with query params
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
    }
  };

  return (
    <Card
      className="p-4 cursor-pointer hover-elevate active-elevate-2 transition-all duration-150 relative group flex flex-col justify-between min-h-[120px]"
      onClick={handleClick}
      data-testid={`card-corner-${cornerId}`}
    >
      <button
        onClick={handleFavoriteClick}
        className="absolute top-3 right-3 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label={isFavorited ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      >
        <Star
          className={`w-5 h-5 transition-all ${isFavorited ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-gray-400'}`}
        />
      </button>

      <div className="mr-8">
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

      <div className="flex items-end justify-between mt-4">
        <p
          className="text-xs text-muted-foreground mb-0.5"
          data-testid={`text-wait-${cornerId}`}
        >
          예상 대기: {hasWaitingData ? (
            <span className="font-medium text-foreground transition-opacity duration-150">{estWait}분</span>
          ) : (
            <span className="font-medium text-muted-foreground">-</span>
          )}
        </p>
        <div className="w-24">
          <CongestionBar
            estWaitTime={hasWaitingData ? estWait : undefined}
            size="md"
            noData={!hasWaitingData}
          />
        </div>
      </div>
    </Card>
  );
}
