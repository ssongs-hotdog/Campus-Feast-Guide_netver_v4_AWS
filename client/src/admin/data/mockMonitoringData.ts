import { CORNERS, RESTAURANTS, CornerConstant } from "./mock_canonical";

export interface MonitoringCornerStatus {
    id: string; // cornerId
    restaurantId: string;
    restaurantName: string;
    cornerName: string;
    estWaitTimeMin: number;
    status: "congested" | "normal" | "closed" | "sold_out" | "data_delay";
    lastUpdatedAt: string; // ISO string
    reliabilityPct: number;
    updateDelayMin: number;
    recentTrendPoints: number[]; // last 10 points for sparkline
    operatingHours: string; // e.g. "11:00 ~ 14:00"
}

export interface MonitoringKpi {
    congestedCount: number;
    avgWaitMin: number;
    maxWaitMin: number;
    updateDelayCount: number;
}

export interface MonitoringHistoryPoint {
    time: string; // HH:mm
    queueCount: number;
    waitTimeMin: number;
}

export interface MonitoringEvent {
    id: string;
    type: "status_change" | "data_delay" | "reliability_drop" | "system";
    message: string;
    timestamp: string;
}

// Deterministic Random Helper
const getDeterministicValue = (id: string, seed: number) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const x = Math.sin(seed + hash) * 10000;
    return x - Math.floor(x);
};

const getOperatingHours = (restaurantId: string, cornerId: string): string => {
    // Simplified logic based on canonical knowledge (mock)
    if (cornerId === 'breakfast_1000') return "08:20 ~ 10:20";
    if (restaurantId === 'materials' && cornerId === 'dinner') return "17:00 ~ 18:30";
    if (cornerId === 'dinner' || cornerId.includes('dinner')) return "17:00 ~ 18:30";
    return "11:00 ~ 14:00"; // Default lunch
};

const generateMonitoringData = (): MonitoringCornerStatus[] => {
    const now = new Date();

    return CORNERS.map(corner => {
        const restaurant = RESTAURANTS.find(r => r.id === corner.restaurantId);
        const r1 = getDeterministicValue(corner.id, 10);
        const r2 = getDeterministicValue(corner.id, 20);

        // Wait Time Logic
        let waitTime = Math.floor(r1 * 30); // 0-30 min
        if (corner.restaurantId === 'hanyang_plaza') waitTime += 5; // Busy place

        // Status Logic
        let status: MonitoringCornerStatus["status"] = "normal";
        if (waitTime >= 20) status = "congested";
        else if (r2 < 0.05) status = "data_delay";
        else if (r2 > 0.95) status = "sold_out";

        // Reliability
        const reliability = 80 + Math.floor(r2 * 20); // 80-100%

        // Update Delay (simulate)
        const delayMin = status === 'data_delay' ? 15 + Math.floor(r1 * 30) : Math.floor(r1 * 3);
        const updateTime = new Date(now.getTime() - delayMin * 60000).toISOString();

        // Trend
        const trend = Array.from({ length: 10 }, (_, i) => {
            return Math.max(0, waitTime + Math.floor(Math.sin(i) * 5));
        });

        return {
            id: corner.id,
            restaurantId: corner.restaurantId,
            restaurantName: restaurant?.name || "Unknown",
            cornerName: corner.name,
            estWaitTimeMin: waitTime,
            status,
            lastUpdatedAt: updateTime,
            reliabilityPct: reliability,
            updateDelayMin: delayMin,
            recentTrendPoints: trend,
            operatingHours: getOperatingHours(corner.restaurantId, corner.id)
        };
    });
};

export const MOCK_MONITORING_DATA = generateMonitoringData();

// Helper Functions
export const getFilteredMonitoringData = (restaurantId: string | "all") => {
    if (restaurantId === "all") return MOCK_MONITORING_DATA;
    return MOCK_MONITORING_DATA.filter(d => d.restaurantId === restaurantId);
};

export const computeMonitoringKpis = (data: MonitoringCornerStatus[]): MonitoringKpi => {
    const congested = data.filter(d => d.status === 'congested').length;
    const delays = data.filter(d => d.updateDelayMin >= 10 || d.status === 'data_delay').length;
    const totalWait = data.reduce((acc, curr) => acc + curr.estWaitTimeMin, 0);
    const avgWait = data.length > 0 ? Math.round((totalWait / data.length) * 10) / 10 : 0;
    const maxWait = data.reduce((max, curr) => Math.max(max, curr.estWaitTimeMin), 0);

    return {
        congestedCount: congested,
        avgWaitMin: avgWait,
        maxWaitMin: maxWait,
        updateDelayCount: delays
    };
};

// History Generator (Deterministic)
export const getMonitoringHistory = (cornerId: string): MonitoringHistoryPoint[] => {
    const points: MonitoringHistoryPoint[] = [];
    const now = new Date();
    // Generate last 60 minutes
    for (let i = 60; i >= 0; i -= 5) {
        const time = new Date(now.getTime() - i * 60000);
        const seedTime = time.getHours() + time.getMinutes();
        const r = getDeterministicValue(cornerId, seedTime);

        const baseWait = 10 + Math.floor(r * 20);
        const baseQueue = Math.floor(baseWait * 1.5 + (r * 5));

        points.push({
            time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            waitTimeMin: baseWait,
            queueCount: baseQueue
        });
    }
    return points;
};

// Event Generator (Deterministic)
export const getMonitoringEvents = (cornerId: string): MonitoringEvent[] => {
    return [
        {
            id: `evt-${cornerId}-1`,
            type: "status_change",
            message: "상태 변경: 원활 -> 혼잡",
            timestamp: new Date(Date.now() - 15 * 60000).toISOString()
        },
        {
            id: `evt-${cornerId}-2`,
            type: "system",
            message: "데이터 수신 정상 확인",
            timestamp: new Date(Date.now() - 45 * 60000).toISOString()
        }
    ];
};
