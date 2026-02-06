/**
 * date.ts - Server-side Date Utilities (KST)
 * 
 * Purpose: Centralize all date/time manipulation logic, specifically handling
 * the Asia/Seoul timezone (+09:00).
 */

/**
 * Get the current date key in KST (Asia/Seoul) timezone.
 * Returns YYYY-MM-DD format.
 */
export function getKSTDateKey(): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return formatter.format(new Date());
}

/**
 * Get the current ISO timestamp in KST (Asia/Seoul) timezone.
 * Returns YYYY-MM-DDTHH:mm:ss+09:00
 */
export function getKSTISOTimestamp(): string {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}+09:00`;
}

/**
 * Get tomorrow's date key in KST (Asia/Seoul) timezone.
 * Returns YYYY-MM-DD format.
 */
export function getTomorrowKSTDateKey(): string {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return formatter.format(tomorrow);
}

/**
 * Get day of week (0-6, Sunday-Saturday) for a date key in KST.
 */
export function getDayOfWeekKST(dateKey: string): number {
    const date = new Date(dateKey + 'T12:00:00+09:00');
    return date.getDay();
}

/**
 * Get Korean day-of-week name.
 */
export function getDayOfWeekNameKo(dayOfWeek: number): string {
    const names = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return names[dayOfWeek] || '';
}

/**
 * Helper to get date keys for the last 4 weeks for a specific day of week.
 * Used for prediction aggregation.
 * 
 * @param targetDayOfWeek 0 (Sun) - 6 (Sat)
 * @param count Number of past weeks to check (default 4)
 * @returns Array of YYYY-MM-DD strings
 */
export function getPastDatesByDayOfWeek(targetDayOfWeek: number, count: number = 4): string[] {
    const dates: string[] = [];
    const now = new Date();
    // Align to KST current date
    const todayKST = new Date(getKSTDateKey() + 'T12:00:00+09:00');

    // Go back week by week
    for (let i = 1; i <= count + 1; i++) { // Check last 5 weeks to ensure we get enough data
        const d = new Date(todayKST);
        d.setDate(d.getDate() - (i * 7));

        // Check if this date's day of week matches (it should, logically)
        if (d.getDay() === targetDayOfWeek) {
            const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Seoul',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
            dates.push(formatter.format(d));
        }
    }

    return dates.slice(0, count);
}
