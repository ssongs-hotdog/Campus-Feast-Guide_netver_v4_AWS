import { startOfHour, subHours, format } from "date-fns";
import { CORNERS, CornerConstant, RESTAURANTS } from "./mock_canonical";

export interface DashboardKPI {
    label: string;
    value: string;
    unit?: string;
    trend: "up" | "down" | "neutral";
    trendValue: string;
    status: "good" | "warning" | "critical";
    description: string;
}

export interface GoalGauge {
    label: string;
    current: number;
    target: number;
    unit: string;
    status: "success" | "warning" | "fail";
}

export interface Bottleneck {
    id: string;
    name: string;
    location: string;
    currentWait: number; // minutes
    prevWait: number; // minutes, for sparkline or comparison
    cause: "high_demand" | "slow_production" | "data_lag" | "outlier";
    causeLabel: string;
    impactScore: number; // 0-100 impact on overall system
    recommendedAction: string;
    history: number[]; // last 60 min (e.g., 6 points)
}

export interface DemandCapacity {
    arrivalRate: number; // people per 10 min
    capacity: number; // people per 10 min
    gap: number;
}

export interface CornerStatus {
    id: string;
    restaurantId: string;
    name: string;
    status: "open" | "congested" | "closed" | "break";
    waitTime: number;
    reliability: "high" | "medium" | "low";
    lastUpdate: string; // concise string like "방금 전"
    lastUpdateMinutes: number; // for logic check
    trend: "rising" | "falling" | "stable";
}

export interface HeatmapCell {
    time: string;
    load: number; // 0-100
}

export interface DashboardDataV2 {
    lastSync: string;
    kpis: DashboardKPI[];
    goals: GoalGauge[];
    bottlenecks: Bottleneck[];
    demandCapacity: DemandCapacity;
    corners: CornerStatus[];
    todaysHeatmap: {
        cornerNames: string[];
        timeLabels: string[];
        data: number[][]; // [cornerIndex][timeIndex]
    };
}

// Deterministic Mock Data Generation
// We use a simple hash function or static mapping based on ID to ensure consistency.

const getDeterministicValue = (id: string, seed: number) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const x = Math.sin(seed + hash) * 10000;
    return x - Math.floor(x);
};

// Generate initial corner statuses
const generateCornerStatus = (corner: CornerConstant): CornerStatus => {
    // Deterministic randomness based on ID
    const r1 = getDeterministicValue(corner.id, 1);
    const r2 = getDeterministicValue(corner.id, 2);

    // Logic: Some corners are busy, some are not.
    // Let's make hanyang_plaza busy (wait > 20), others moderate.
    let waitTime = 5;
    let status: CornerStatus["status"] = "open";

    if (corner.restaurantId === "hanyang_plaza") {
        waitTime = 15 + Math.floor(r1 * 15); // 15-30 min
        status = waitTime > 20 ? "congested" : "warning" as any; // Using valid status
        if (waitTime <= 20) status = "open"; // Simplified status logic
    } else if (corner.restaurantId === "human_ecology") {
        waitTime = 5 + Math.floor(r1 * 10); // 5-15 min
    } else {
        waitTime = Math.floor(r1 * 10); // 0-10 min
    }

    // Status Logic
    if (waitTime >= 20) status = "congested";
    else if (waitTime >= 10) status = "open"; // "warning" is not in type, mapped to open with color logic elsewhere or type update.
    // Actually the type has "congested", "open", "closed", "break".
    // Let's stick to those.

    if (waitTime === 0) status = "break";

    return {
        id: corner.id,
        restaurantId: corner.restaurantId,
        name: corner.name,
        status: status,
        waitTime: waitTime,
        reliability: r2 > 0.8 ? "medium" : "high", // 20% medium reliability
        lastUpdate: "방금 전",
        lastUpdateMinutes: 0,
        trend: r1 > 0.6 ? "rising" : r1 < 0.3 ? "falling" : "stable",
    };
};

const INITIAL_CORNERS: CornerStatus[] = CORNERS.map(generateCornerStatus);

// filtering helper
export const getFilteredCorners = (restaurantId: string | "all"): CornerStatus[] => {
    if (restaurantId === "all") return INITIAL_CORNERS;
    return INITIAL_CORNERS.filter(c => c.restaurantId === restaurantId);
};

// Compute Helper: Scoreboard
export const computeScoreboard = (corners: CornerStatus[]): { kpis: DashboardKPI[]; goals: GoalGauge[] } => {
    const totalWait = corners.reduce((acc, c) => acc + c.waitTime, 0);
    const avgWait = corners.length > 0 ? Math.round((totalWait / corners.length) * 10) / 10 : 0;

    // Congestion Exposure: Sum of wait times of congested corners (simple metric) or just total wait * factor
    const congestionExposure = corners
        .filter(c => c.waitTime >= 15)
        .reduce((acc, c) => acc + c.waitTime, 0);

    // Reliability Pct
    const reliableCount = corners.filter(c => c.reliability === "high").length;
    const reliability = corners.length > 0 ? Math.round((reliableCount / corners.length) * 100) : 100;

    return {
        kpis: [
            {
                label: "총 혼잡 노출(분)",
                value: congestionExposure.toString(),
                unit: "분",
                trend: "up",
                trendValue: "+12%",
                status: congestionExposure > 100 ? "warning" : "good",
                description: "혼잡 상태(15분+) 누적 시간",
            },
            {
                label: "Peak 평균 대기",
                value: avgWait.toString(),
                unit: "분",
                trend: avgWait > 15 ? "up" : "neutral",
                trendValue: "+4.2분",
                status: avgWait > 20 ? "critical" : avgWait > 10 ? "warning" : "good",
                description: "현재 운영 중인 코너 평균",
            },
            {
                label: "데이터 신뢰도",
                value: reliability.toString(),
                unit: "%",
                trend: reliability < 90 ? "down" : "neutral",
                trendValue: "-1.5%",
                status: reliability < 80 ? "critical" : reliability < 95 ? "good" : "good",
                description: "CCTV/POS 데이터 수신율",
            },
        ],
        goals: [
            {
                label: "Peak 대기 관리",
                current: avgWait,
                target: 15, // Goal: below 15 min avg
                unit: "분",
                status: avgWait <= 15 ? "success" : "fail",
            },
            {
                label: "운영 가동률",
                current: 98, // Static for now
                target: 95,
                unit: "%",
                status: "success",
            },
        ],
    };
};

// Compute Helper: Bottlenecks
export const computeBottlenecks = (corners: CornerStatus[]): { bottlenecks: Bottleneck[]; demandCapacity: DemandCapacity } => {
    // Thresholds: Wait >= 15 min OR Reliability < 80% (High/Medium is fine, Low is bad) ?
    // User requirement: wait >= 15m OR reliability < 90%
    const thresholdWait = 15;

    const problems = corners.filter(c =>
        c.waitTime >= thresholdWait ||
        c.reliability === "low"
    );

    // Sort by severity (wait time descending)
    problems.sort((a, b) => b.waitTime - a.waitTime);

    const top3 = problems.slice(0, 3).map(c => {
        let cause: Bottleneck["cause"] = "high_demand";
        let causeLabel = "수요 급증";
        let action = "추가 배식대 개방 권장";

        if (c.reliability === "low") {
            cause = "data_lag";
            causeLabel = "데이터 지연";
            action = "POS 연결 상태 확인 필요";
        } else if (c.waitTime > 30) {
            cause = "slow_production";
            causeLabel = "조리 지연";
            action = "주방 인력 재배치 확인";
        }

        return {
            id: c.id,
            name: c.name,
            location: RESTAURANTS.find(r => r.id === c.restaurantId)?.name || "Unknown",
            currentWait: c.waitTime,
            prevWait: Math.max(0, c.waitTime - 5),
            cause,
            causeLabel,
            impactScore: Math.min(100, c.waitTime * 2),
            recommendedAction: action,
            history: [c.waitTime - 10, c.waitTime - 5, c.waitTime - 2, c.waitTime + 2, c.waitTime + 5, c.waitTime] // Fake sparkline based on current
        };
    });

    // Demand Capacity Logic (Aggregated)
    // Simplified: Capacity = 20 * num_corners. Arrival = Capacity + (Gap based on wait trend)
    const totalCap = corners.length * 20;
    const totalWait = corners.reduce((acc, c) => acc + c.waitTime, 0);
    // If wait is high, arrival > capacity
    const arrivalRate = totalCap + (totalWait * 2);
    const gap = arrivalRate - totalCap;

    return {
        bottlenecks: top3,
        demandCapacity: {
            arrivalRate: Math.round(arrivalRate),
            capacity: Math.round(totalCap),
            gap: Math.round(gap)
        }
    };
};

// Compute Helper: Heatmap
export const computeHeatmap = (corners: CornerStatus[]): DashboardDataV2["todaysHeatmap"] => {
    // Simple static logic: Generate data for valid corners only
    const times = ["11:00", "11:30", "12:00", "12:30", "13:00", "13:30"];
    const data = corners.map(c => {
        // Deterministic patterns based on corner ID
        const seed = getDeterministicValue(c.id, 5);
        return times.map((_, idx) => {
            // Peak at 12:00 (idx 2) and 12:30 (idx 3)
            let base = 20;
            if (idx === 2 || idx === 3) base = 60;
            if (idx === 1 || idx === 4) base = 40;

            // Add randomness
            const val = base + Math.floor(getDeterministicValue(c.id, idx) * 30);
            return Math.min(100, Math.max(0, val));
        });
    });

    return {
        cornerNames: corners.map(c => c.name),
        timeLabels: times,
        data: data
    };
};


// Main Fetch Function (simulating API)
export const fetchDashboardDataV2 = async (restaurantId: string | "all" = "all"): Promise<DashboardDataV2> => {
    // Simulate network delay
    // await new Promise((resolve) => setTimeout(resolve, 300));
    // Removed delay for snappier UI interaction as requested "filter should apply immediately"
    // But usually async in real app. Let's keep small delay or make it sync for this demo?
    // User asked for "filter should apply immediately; no page refresh required".
    // This implies keeping state client side or very fast fetch. 
    // Since we are mocking, we can just return sync or fast async.

    const filteredCorners = getFilteredCorners(restaurantId);
    const scoreboard = computeScoreboard(filteredCorners);
    const bottlenecks = computeBottlenecks(filteredCorners);
    const heatmap = computeHeatmap(filteredCorners);

    return {
        lastSync: new Date().toISOString(),
        kpis: scoreboard.kpis,
        goals: scoreboard.goals,
        bottlenecks: bottlenecks.bottlenecks,
        demandCapacity: bottlenecks.demandCapacity,
        corners: filteredCorners,
        todaysHeatmap: heatmap,
    };
};
