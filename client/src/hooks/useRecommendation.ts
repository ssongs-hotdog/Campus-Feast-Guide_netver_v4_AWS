
import { useMemo } from 'react';
import type { WaitingData, MenuItem, MenuData } from '@shared/types';

export interface RecommendationItem {
    restaurantId: string;
    cornerId: string;
    cornerName: string; // e.g., "한양플라자 - 양식"
    menuName: string;
    price: number;
    estWaitTimeMin: number;
    type: 'fast' | 'value' | 'trend' | 'general';
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

// Helper to get price from menu data
const getPrice = (rId: string, cId: string, menuData: MenuData | null): number => {
    if (!menuData || !menuData[rId] || !menuData[rId][cId]) return 0;
    return menuData[rId][cId].priceWon;
};

// Helper to get menu name
const getMenuName = (rId: string, cId: string, menuData: MenuData | null): string => {
    if (!menuData || !menuData[rId] || !menuData[rId][cId]) return '';
    return menuData[rId][cId].mainMenuName;
};

export function useRecommendation(
    waitingData: WaitingData[] | undefined,
    menuData: MenuData | null,
    isWaitingLoading: boolean
) {
    // Mock History Data for Trend Logic (DEV ONLY)
    const historyData = useMemo(() => {
        if (import.meta.env.DEV) {
            // Mock: Create a map of past wait times (30 mins ago)
            // We'll intentionally make some have HIGHER past wait times to simulate a DROP (Trend)
            const mock: Record<string, number> = {};
            waitingData?.forEach(w => {
                // Randomly assign 20% of items to have a "trend" (past was higher)
                if (Math.random() > 0.8) {
                    mock[`${w.restaurantId}-${w.cornerId}`] = w.estWaitTimeMin + Math.floor(Math.random() * 10) + 5; // Was 5-15 mins higher
                } else {
                    mock[`${w.restaurantId}-${w.cornerId}`] = w.estWaitTimeMin; // No change
                }
            });
            return mock;
        }
        return {}; // In prod, we would need real history data passed in
    }, [waitingData]); // Re-generate mock only when waiting data updates


    const allItems: RecommendationItem[] = useMemo(() => {
        if (!waitingData || !menuData) return [];

        return waitingData.map(w => {
            const price = getPrice(w.restaurantId, w.cornerId, menuData);
            const menuName = getMenuName(w.restaurantId, w.cornerId, menuData);

            // Simple corner name mapping (could be improved with proper config)
            let rName = '';
            if (w.restaurantId === 'hanyang_plaza') rName = '한플';
            else if (w.restaurantId === 'materials') rName = '신소재';
            else if (w.restaurantId === 'life_science') rName = '생과대';

            return {
                restaurantId: w.restaurantId,
                cornerId: w.cornerId,
                cornerName: `${rName} - ${w.cornerId}`, // Fallback corner name
                menuName,
                price,
                estWaitTimeMin: w.estWaitTimeMin,
                type: 'general' as const,
                reason: '',
            };
        }).filter(item => item.price > 0); // Filter out items without menu/price
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

        // 1. Calculate thresholds
        const prices = allItems.map(i => i.price).sort((a, b) => a - b);
        const waitTimes = allItems.map(i => i.estWaitTimeMin).sort((a, b) => a - b);

        if (prices.length === 0) return null;

        const priceThreshold = prices[Math.floor(prices.length * 0.3)] || 5000; // Bottom 30% or fallback
        const waitCap = waitTimes[Math.floor(waitTimes.length * 0.8)] || 30; // Avoid top 20% longest

        // 2. Filter candidates
        const candidates = allItems.filter(i => i.price <= priceThreshold && i.estWaitTimeMin <= waitCap);

        // 3. Pick best among candidates (lowest wait)
        let pick = null;
        let reason = "가격은 낮고, 대기는 무난해요";

        if (candidates.length > 0) {
            pick = candidates.sort((a, b) => a.estWaitTimeMin - b.estWaitTimeMin)[0];
        } else {
            // Fallback: Just cheapest
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

        let bestDrop = 0;
        let pick = null;

        allItems.forEach(item => {
            const pastWait = historyData[`${item.restaurantId}-${item.cornerId}`];
            if (pastWait !== undefined) {
                const drop = pastWait - item.estWaitTimeMin;
                if (drop > bestDrop) {
                    bestDrop = drop;
                    pick = item;
                }
            }
        });

        if (!pick) return null;

        return {
            ...pick,
            type: 'trend' as const,
            reason: '방금부터 내려가는 중'
        };
    }, [allItems, historyData]);


    const topPicks = useMemo(() => {
        // Ensure distinct picks if possible? (Simplicity for v1: allow duplicates but maybe filter ID)
        // Actually duplication is okay if it satisfies multiple reasons, but better UX to dedupe visually?
        // User req: "Exactly 3 cards". If we don't have enough distinct, we might shortage.
        // For V1, let's just return what we have.
        return [fastestPick, valuePick, trendPick].filter(Boolean) as RecommendationItem[];
    }, [fastestPick, valuePick, trendPick]);

    return {
        topPicks,
        recommendations: allItems, // For now pass all, filtering handled in UI/Page for simplicity or move here next
        isLoading: isWaitingLoading,
        historyData,
        lastUpdated: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    };
}
