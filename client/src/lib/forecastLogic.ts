import { WaitingData } from '@shared/types';

export interface ForecastPoint {
    time: string;
    waitMinutes: number | undefined;
    isMissing: boolean;
}

/**
 * Generates forecast data points based on anchor time and available waiting data.
 * 
 * @param anchorTimeStr - Anchor time in "HH:MM" format (e.g., "11:30")
 * @param allWaitingData - List of all waiting data items (weekday averages)
 * @param restaurantId - Target restaurant ID
 * @param cornerId - Target corner ID
 * @returns Array of 7 forecast points (0, +10, ..., +60 min)
 */
export function getForecastData(
    anchorTimeStr: string,
    allWaitingData: WaitingData[],
    restaurantId: string,
    cornerId: string
): ForecastPoint[] {
    // Helper to parse HH:MM to minutes
    const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const anchorMinutes = toMinutes(anchorTimeStr);

    // Generate 7 data points (0, +10, ..., +60)
    const offsets = [0, 10, 20, 30, 40, 50, 60];

    // Filter mainly for this restaurant/corner once
    const candidates = allWaitingData.filter(
        item => item.restaurantId === restaurantId && item.cornerId === cornerId
    );

    return offsets.map(offset => {
        const targetMinutes = anchorMinutes + offset;

        // Find nearest data point from candidates (Snapping)
        let bestItem: WaitingData | null = null;
        let minDiff = 6; // Tolerance + epsilon (strictly < 6 means <= 5)

        for (const item of candidates) {
            // Extract HH:MM from timestamp
            const date = new Date(item.timestamp);
            const itemH = date.getHours();
            const itemM = date.getMinutes();
            const itemMinutes = itemH * 60 + itemM;

            const diff = itemMinutes - targetMinutes;
            const absDiff = Math.abs(diff);

            if (absDiff <= 5) {
                // Tie-break: prefer future side (diff >= 0)
                // If we found a better diff, OR equal diff but this one is future-side
                if (absDiff < minDiff || (absDiff === minDiff && diff >= 0)) {
                    minDiff = absDiff;
                    bestItem = item;
                }
            }
        }

        return {
            time: offset === 0 ? "지금" : `+${offset}분`,
            waitMinutes: bestItem ? bestItem.estWaitTimeMin : undefined,
            isMissing: !bestItem
        };
    });
}
