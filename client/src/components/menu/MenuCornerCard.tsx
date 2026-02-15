/**
 * MenuCornerCard.tsx - Corner Card for Menu Tab
 * 
 * Purpose: Displays a single menu corner card.
 * Optimized for the Menu tab view (No congestion data).
 */
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { useFavorites } from '@/lib/favoritesContext';
import {
    getMenuVariants,
    isBreakfastCorner,
    hasRealVariants,
    type MenuItem,
} from '@shared/types';
import type { DayKey } from '@/lib/dateUtils';

interface MenuCornerCardProps {
    menu?: MenuItem | null;
    dayKey: DayKey;
    restaurantId: string;
    cornerId: string;
    cornerDisplayName: string;
    isActive?: boolean;  // Whether corner is currently operating
}

export function MenuCornerCard({
    menu,
    dayKey,
    restaurantId,
    cornerId,
    cornerDisplayName,
    isActive = false,
}: MenuCornerCardProps) {
    const [, setLocation] = useLocation();
    const { isFavorite, toggleFavorite } = useFavorites();

    const isFavorited = isFavorite(cornerId);

    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleFavorite(cornerId);
    };

    const hasMenuData = !!menu;

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
        // Menu tab navigation - simple route with date query param
        setLocation(`/menu/detail/${restaurantId}/${cornerId}?date=${dayKey}`);
    };

    return (
        <Card
            className="p-4 cursor-pointer hover-elevate active-elevate-2 transition-all duration-150 relative group flex flex-col"
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
                    className="mb-2 text-xs font-medium px-2 py-0.5 w-fit"
                    data-testid={`badge-corner-${cornerId}`}
                >
                    {menu?.cornerDisplayName || cornerDisplayName}
                </Badge>
                <h3
                    className={`text-lg font-semibold truncate ${hasMenuData ? 'text-foreground' : 'text-muted-foreground'}`}
                    data-testid={`text-menu-${cornerId}`}
                >
                    {menuDisplayName}
                </h3>
            </div>
        </Card>
    );
}

