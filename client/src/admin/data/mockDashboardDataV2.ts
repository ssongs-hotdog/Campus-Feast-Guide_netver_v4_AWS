import { startOfHour, subHours, format } from "date-fns";

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
    name: string;
    status: "open" | "congested" | "closed" | "break";
    waitTime: number;
    reliability: "high" | "medium" | "low";
    lastUpdate: string;
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

// Mock Data Generator
export const fetchDashboardDataV2 = async (): Promise<DashboardDataV2> => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    const now = new Date();

    return {
        lastSync: now.toISOString(),
        kpis: [
            {
                label: "총 혼잡 노출 시간",
                value: "142",
                unit: "분",
                trend: "up",
                trendValue: "+12%",
                status: "warning",
                description: "전체 코너의 혼잡 상태 누적 시간",
            },
            {
                label: "Peak 평균 대기",
                value: "18.5",
                unit: "분",
                trend: "up",
                trendValue: "+4.2분",
                status: "critical",
                description: "점심 피크타임(11:30~13:00) 평균",
            },
            {
                label: "데이터 신뢰도",
                value: "94.2",
                unit: "%",
                trend: "down",
                trendValue: "-1.5%",
                status: "good",
                description: "CCTV 및 POS 데이터 수신율",
            },
        ],
        goals: [
            {
                label: "Peak 대기 관리",
                current: 18.5,
                target: 15,
                unit: "분",
                status: "fail", // current > target is bad for wait time
            },
            {
                label: "운영 가동률",
                current: 98,
                target: 95,
                unit: "%",
                status: "success",
            },
        ],
        bottlenecks: [
            {
                id: "c-101",
                name: "한식 코너 A",
                location: "학생식당 1층",
                currentWait: 25,
                prevWait: 15,
                cause: "high_demand",
                causeLabel: "수요 급증",
                impactScore: 45,
                recommendedAction: "추가 배식대 개방 권장",
                history: [10, 12, 18, 22, 24, 25],
            },
            {
                id: "c-104",
                name: "돈까스 코너",
                location: "학생식당 2층",
                currentWait: 22,
                prevWait: 20,
                cause: "slow_production",
                causeLabel: "조리 지연",
                impactScore: 30,
                recommendedAction: "주방 인력 재배치 확인",
                history: [15, 18, 19, 20, 21, 22],
            },
            {
                id: "c-107",
                name: "일품 코너",
                location: "교직원 식당",
                currentWait: 18,
                prevWait: 12,
                cause: "data_lag",
                causeLabel: "데이터 지연",
                impactScore: 15,
                recommendedAction: "POS 연결 상태 확인 필요",
                history: [8, 9, 10, 12, 15, 18],
            },
        ],
        demandCapacity: {
            arrivalRate: 85, // users / 10min
            capacity: 60, // users / 10min
            gap: -25,
        },
        corners: [
            {
                id: "c-101",
                name: "한식 코너 A",
                status: "congested",
                waitTime: 25,
                reliability: "high",
                lastUpdate: "방금 전",
                trend: "rising",
            },
            {
                id: "c-102",
                name: "한식 코너 B",
                status: "open",
                waitTime: 8,
                reliability: "high",
                lastUpdate: "1분 전",
                trend: "stable",
            },
            {
                id: "c-103",
                name: "양식 코너",
                status: "open",
                waitTime: 12,
                reliability: "medium",
                lastUpdate: "3분 전",
                trend: "falling",
            },
            {
                id: "c-104",
                name: "돈까스 코너",
                status: "congested",
                waitTime: 22,
                reliability: "high",
                lastUpdate: "방금 전",
                trend: "rising",
            },
            {
                id: "c-105",
                name: "분식 코너",
                status: "open",
                waitTime: 5,
                reliability: "high",
                lastUpdate: "30초 전",
                trend: "stable",
            },
            {
                id: "c-106",
                name: "덮밥 코너",
                status: "break",
                waitTime: 0,
                reliability: "high",
                lastUpdate: "-",
                trend: "stable",
            },
        ],
        todaysHeatmap: {
            cornerNames: ["한식A", "한식B", "양식", "돈까스", "분식"],
            timeLabels: ["11:00", "11:30", "12:00", "12:30", "13:00", "13:30"],
            // 0-100 congestion level
            data: [
                [10, 30, 80, 90, 60, 20], // 한식A
                [5, 10, 40, 50, 30, 10],  // 한식B
                [20, 40, 60, 70, 50, 20], // 양식
                [30, 50, 90, 95, 80, 40], // 돈까스
                [10, 20, 40, 30, 20, 10], // 분식
            ],
        },
    };
};
