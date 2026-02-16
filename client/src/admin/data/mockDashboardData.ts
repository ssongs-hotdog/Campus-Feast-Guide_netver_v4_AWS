export interface DashboardStats {
    activeCorners: number;
    busyCorners: number;
    avgWaitTime: number;
    maxWaitTime: number;
    systemStatus: 'normal' | 'warning' | 'error';
    lastSync: string;
}

export interface CornerStatus {
    id: string;
    restaurantName: string;
    cornerName: string;
    waitTime: number;
    status: 'normal' | 'busy' | 'closed';
    lastUpdate: string;
}

export const MOCK_STATS: DashboardStats = {
    activeCorners: 12,
    busyCorners: 3,
    avgWaitTime: 8,
    maxWaitTime: 25,
    systemStatus: 'normal',
    lastSync: new Date().toISOString()
};

export const MOCK_HOTSPOTS: CornerStatus[] = [
    {
        id: '1',
        restaurantName: '학생식당',
        cornerName: '라면/우동',
        waitTime: 25,
        status: 'busy',
        lastUpdate: '1 min ago'
    },
    {
        id: '2',
        restaurantName: '학생식당',
        cornerName: '돈까스',
        waitTime: 18,
        status: 'busy',
        lastUpdate: '2 mins ago'
    },
    {
        id: '3',
        restaurantName: '신소재공학관',
        cornerName: '김밥/분식',
        waitTime: 15,
        status: 'normal',
        lastUpdate: '5 mins ago'
    },
    {
        id: '4',
        restaurantName: '생활과학관',
        cornerName: '교직원식당',
        waitTime: 12,
        status: 'normal',
        lastUpdate: '3 mins ago'
    },
    {
        id: '5',
        restaurantName: '제2공학관',
        cornerName: '덮밥',
        waitTime: 10,
        status: 'normal',
        lastUpdate: 'Just now'
    }
];

export async function fetchDashboardData(): Promise<{ stats: DashboardStats; hotspots: CornerStatus[] }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
        stats: MOCK_STATS,
        hotspots: MOCK_HOTSPOTS
    };
}
