import { useMemo } from 'react';
import type { WaitingData, MenuItem, MenuData } from '@shared/types';

export interface RecommendationItem {
    restaurantId: string;
    cornerId: string;
    cornerName: string; // e.g., "한양플라자 - 양식"
    menuName: string;
    price: number;
    estWaitTimeMin: number;
    averageRating: number;
    type: 'fast' | 'value' | 'trend' | 'rating' | 'general';
    reason: string;
}

export interface UseRecommendationReturn {
    topPicks: RecommendationItem[];
    recommendations: RecommendationItem[];
    isLoading: boolean;
    filter: (category: string) => void;
    sort: (option: string) => void;
    activeFilter: string;
    activeSort: string;
    lastUpdated: string;
}

// Helper to get price and rating from menu data
const getMenuInfo = (rId: string, cId: string, menuData: MenuData | null) => {
    if (!menuData || !menuData[rId] || !menuData[rId][cId]) {
        return { price: 0, rating: 0, name: '' };
    }
    const item = menuData[rId][cId];
    return {
        price: item.priceWon,
        rating: item.averageRating || 0,
        name: item.mainMenuName
    };
};

export function useRecommendation(
    waitingData: WaitingData[] | undefined,
    menuData: MenuData | null,
    isWaitingLoading: boolean
) {
    // Mock History Data for Trend Logic (DEV ONLY)
    const historyData = useMemo(() => {
        if (import.meta.env.DEV) {
            const mock: Record<string, number> = {};
            waitingData?.forEach(w => {
                // Ensure wait time is treated as number, fallback to 0 if undefined
                const currentWait = w.estWaitTimeMin ?? 0;
                if (Math.random() > 0.8) {
                    mock[`${w.restaurantId}-${w.cornerId}`] = currentWait + Math.floor(Math.random() * 10) + 5;
                } else {
                    mock[`${w.restaurantId}-${w.cornerId}`] = currentWait;
                }
            });
            return mock;
        }
        return {};
    }, [waitingData]);


    const allItems: RecommendationItem[] = useMemo(() => {
        if (!waitingData || !menuData) return [];

        return waitingData.map(w => {
            const { price, rating, name } = getMenuInfo(w.restaurantId, w.cornerId, menuData);

            let rName = '';
            if (w.restaurantId === 'hanyang_plaza') rName = '한플';
            else if (w.restaurantId === 'materials') rName = '신소재';
            else if (w.restaurantId === 'life_science') rName = '생과대';

            return {
                restaurantId: w.restaurantId,
                cornerId: w.cornerId,
                cornerName: `${rName} - ${w.cornerId}`,
                menuName: name,
                price,
                // Fix: Ensure estWaitTimeMin is never undefined. Fallback to 0.
                estWaitTimeMin: w.estWaitTimeMin ?? 0,
                averageRating: rating,
                type: 'general' as const,
                reason: '',
            };
        }).filter(item => item.price > 0);
    }, [waitingData, menuData]);


    // --- Logic 1: Fastest ---
    const fastestPick = useMemo(() => {
        if (allItems.length === 0) return null;
        const sorted = [...allItems].sort((a, b) => a.estWaitTimeMin - b.estWaitTimeMin);
        const pick = sorted[0];
        return {
            ...pick,
            type: 'fast' as const,
            reason: '지금 가장 짧게 끝나요'
        };
    }, [allItems]);

    // --- Logic 2: Value (Low Price + Reasonable Wait) ---
    const valuePick = useMemo(() => {
        if (allItems.length === 0) return null;

        const prices = allItems.map(i => i.price).sort((a, b) => a - b);
        const waitTimes = allItems.map(i => i.estWaitTimeMin).sort((a, b) => a - b);

        if (prices.length === 0) return null;

        const priceThreshold = prices[Math.floor(prices.length * 0.3)] || 5000;
        const waitCap = waitTimes[Math.floor(waitTimes.length * 0.8)] || 30;

        const candidates = allItems.filter(i => i.price <= priceThreshold && i.estWaitTimeMin <= waitCap);

        let pick = null;
        let reason = "가격은 낮고, 대기는 무난해요";

        if (candidates.length > 0) {
            pick = candidates.sort((a, b) => a.estWaitTimeMin - b.estWaitTimeMin)[0];
        } else {
            pick = [...allItems].sort((a, b) => a.price - b.price)[0];
            if (pick.estWaitTimeMin > 15) {
                reason = "지금은 인기라 대기가 있어요. 그래도 가격은 좋아요";
            }
        }

        if (!pick) return null;

        return {
            ...pick,
            type: 'value' as const,
            reason
        };
    }, [allItems]);

    // --- Logic 3: Trend (Descending Wait Time) ---
    const trendPick = useMemo(() => {
        if (allItems.length === 0) return null;

        const best = allItems.reduce((acc, item) => {
            const pastWait = historyData[`${item.restaurantId}-${item.cornerId}`];
            if (pastWait === undefined) return acc;

            const drop = pastWait - item.estWaitTimeMin;
            if (drop > acc.drop) {
                return { item, drop };
            }
            return acc;
        }, { item: null as RecommendationItem | null, drop: 0 });

        if (!best.item) return null;

        return {
            ...best.item,
            type: 'trend' as const,
            reason: '방금부터 내려가는 중'
        };
    }, [allItems, historyData]);

    // --- Logic 4: Top Rated (New) ---
    const ratingPick = useMemo(() => {
        if (allItems.length === 0) return null;

        // Sort by averageRating descending. 
        // If rating is 0 (no data), it will be at the bottom.
        // We only want to pick if rating > 0.
        const candidates = allItems.filter(i => i.averageRating > 0);
        if (candidates.length === 0) return null;

        const sorted = candidates.sort((a, b) => b.averageRating - a.averageRating);
        const pick = sorted[0];

        return {
            ...pick,
            type: 'rating' as const,
            reason: '학생들이 인정한 실패 없는 맛'
        };
    }, [allItems]);


    const topPicks = useMemo(() => {
        // Return 4 picks if available, UI maps them.
        return [ratingPick, fastestPick, valuePick, trendPick].filter(Boolean) as RecommendationItem[];
    }, [fastestPick, valuePick, trendPick, ratingPick]);

    return {
        topPicks,
        recommendations: allItems,
        isLoading: isWaitingLoading,
        filter: (category: string) => { }, // Placeholder for future use
        sort: (option: string) => { }, // Placeholder for future use
        activeFilter: 'all',
        activeSort: 'fast',
        lastUpdated: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    };
}
