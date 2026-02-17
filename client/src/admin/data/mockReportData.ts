// Mock data generator for weekly performance report

import {
    WeeklyReport,
    ReportFilter,
    WeekRange,
    ViewMode,
    ReportScope,
    KPISummary,
    Insight,
    DailyRevenue,
    HourlyDistribution,
    VenuePerformance,
    EfficiencyMetrics,
    Recommendation,
    MenuPerformance,
    MenuReview,
} from "./reportModel";

// Helper to get date range from filter
function getDateRange(filter: ReportFilter): { start: Date; end: Date; label: string } {
    const now = new Date();
    let start: Date;
    let end: Date;
    let label: string;

    switch (filter.weekRange) {
        case WeekRange.THIS_WEEK:
            start = new Date(now);
            start.setDate(now.getDate() - now.getDay()); // Sunday
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            label = `${formatDate(start)} - ${formatDate(end)}`;
            break;
        case WeekRange.LAST_WEEK:
            start = new Date(now);
            start.setDate(now.getDate() - now.getDay() - 7);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            label = `${formatDate(start)} - ${formatDate(end)}`;
            break;
        case WeekRange.LAST_4_WEEKS:
            start = new Date(now);
            start.setDate(now.getDate() - 28);
            end = new Date(now);
            label = `최근 4주 (${formatDate(start)} - ${formatDate(end)})`;
            break;
        case WeekRange.CUSTOM:
            start = filter.customStart ? new Date(filter.customStart) : new Date(now);
            end = filter.customEnd ? new Date(filter.customEnd) : new Date(now);
            label = `${formatDate(start)} - ${formatDate(end)}`;
            break;
        default:
            start = new Date(now);
            end = new Date(now);
            label = formatDate(now);
    }

    return { start, end, label };
}

function formatDate(date: Date): string {
    return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\. /g, ".").replace(/\.$/, "");
}

function getDayOfWeek(date: Date): string {
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return days[date.getDay()];
}

// Mock data generators
export function generateMockReport(filter: ReportFilter): WeeklyReport {
    const { start, end, label } = getDateRange(filter);

    const kpi: KPISummary = {
        totalRevenue: 45_230_000,
        totalTransactions: 3_842,
        avgTicketSize: 11_770,
        topCorner: {
            name: "천원의 아침밥",
            value: 1_240,
        },
        satisfaction: {
            avgRating: 4.2,
            reviewCount: 284,
        },
        issueCount: 2,
    };

    const insights: Insight[] = [
        {
            id: "insight-1",
            type: "positive",
            message: "라면 코너 매출 전주 대비 +12% 증가",
        },
        {
            id: "insight-2",
            type: "negative",
            message: "돈까스 메뉴 별점 3.8 → 2.9로 급락 (품질 이슈 의심)",
        },
        {
            id: "insight-3",
            type: "neutral",
            message: "12:00-12:30 시간대에 전체 거래의 35% 집중",
        },
    ];

    const dailyRevenue: DailyRevenue[] = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dailyRevenue.push({
            date: date.toISOString().split("T")[0],
            dayOfWeek: getDayOfWeek(date),
            revenue: 5_000_000 + Math.random() * 3_000_000,
            transactions: 450 + Math.floor(Math.random() * 200),
        });
    }

    const hourlyDistribution: HourlyDistribution[] = [];
    for (let hour = 7; hour <= 19; hour++) {
        let transactions = 50;
        if (hour >= 11 && hour <= 13) {
            transactions = 400 + Math.floor(Math.random() * 200); // 점심 피크
        } else if (hour >= 17 && hour <= 19) {
            transactions = 250 + Math.floor(Math.random() * 100); // 저녁 피크
        }
        hourlyDistribution.push({
            hour,
            transactions,
            revenue: transactions * (10_000 + Math.random() * 5_000),
        });
    }

    const venuePerformance: VenuePerformance[] = [
        {
            id: "student_hall",
            name: "학생회관 식당",
            type: "restaurant",
            revenue: 18_500_000,
            transactions: 1_542,
            avgTicketSize: 12_000,
            marketShare: 40.9,
        },
        {
            id: "hanyang_plaza",
            name: "한양플라자",
            type: "restaurant",
            revenue: 15_200_000,
            transactions: 1_234,
            avgTicketSize: 12_320,
            marketShare: 33.6,
        },
        {
            id: "breakfast_1000",
            name: "천원의 아침밥",
            type: "corner",
            revenue: 1_240_000,
            transactions: 1_240,
            avgTicketSize: 1_000,
            marketShare: 32.3,
        },
        {
            id: "ramen",
            name: "라면 코너",
            type: "corner",
            revenue: 8_400_000,
            transactions: 1_680,
            avgTicketSize: 5_000,
            marketShare: 43.7,
        },
    ];

    const efficiency: EfficiencyMetrics = {
        hourlyThroughput: [
            { hour: 11, transactionsPerHour: 320 },
            { hour: 12, transactionsPerHour: 580 },
            { hour: 13, transactionsPerHour: 420 },
            { hour: 17, transactionsPerHour: 280 },
            { hour: 18, transactionsPerHour: 340 },
        ],
        peakConcentration: {
            top20PercentHours: ["12:00-12:30", "18:00-18:30"],
            concentrationRate: 42.3,
        },
    };

    const recommendations: Recommendation[] = [
        {
            id: "rec-1",
            priority: "high",
            title: "점심 피크 인력 배치 조정",
            description: "12:00-12:30 시간대 처리량 집중(42%). 인력 2-3명 추가 배치 권장",
            category: "staffing",
        },
        {
            id: "rec-2",
            priority: "high",
            title: "돈까스 메뉴 품질 점검",
            description: "별점 3.8→2.9 급락. 즉시 원인 파악 및 개선 필요",
            category: "quality",
        },
        {
            id: "rec-3",
            priority: "medium",
            title: "라면 코너 운영시간 연장 검토",
            description: "매출 +12% 증가 추세. 운영시간 연장 시 추가 매출 기대",
            category: "operations",
        },
    ];

    const menuPerformance: MenuPerformance[] = [
        {
            menuId: "menu-1",
            menuName: "돈까스",
            cornerName: "한식",
            sales: 420,
            marketShare: 10.9,
            avgRating: 2.9,
            reviewCount: 42,
            status: "high_sales_low_rating",
        },
        {
            menuId: "menu-2",
            menuName: "제육볶음",
            cornerName: "한식",
            sales: 520,
            marketShare: 13.5,
            avgRating: 4.5,
            reviewCount: 68,
            status: "star",
        },
        {
            menuId: "menu-3",
            menuName: "비빔냉면",
            cornerName: "중식/냉면",
            sales: 120,
            marketShare: 3.1,
            avgRating: 4.7,
            reviewCount: 15,
            status: "low_sales_high_rating",
        },
        {
            menuId: "menu-4",
            menuName: "라면",
            cornerName: "라면",
            sales: 680,
            marketShare: 17.7,
            avgRating: 4.3,
            reviewCount: 89,
            status: "star",
        },
        {
            menuId: "menu-5",
            menuName: "스파게티",
            cornerName: "양식",
            sales: 85,
            marketShare: 2.2,
            avgRating: 3.1,
            reviewCount: 12,
            status: "underperformer",
        },
    ];

    const reviews: MenuReview[] = [
        {
            id: "rev-1",
            menuName: "돈까스",
            rating: 2,
            comment: "고기가 질기고 소스가 너무 짜요. 이전에 먹었을 때보다 맛이 많이 떨어진 것 같습니다.",
            createdAt: "2026-02-15T12:30:00Z",
            userName: "학생A",
        },
        {
            id: "rev-2",
            menuName: "돈까스",
            rating: 3,
            comment: "튀김옷이 너무 두껍고 기름진 느낌이에요.",
            createdAt: "2026-02-14T18:20:00Z",
            userName: "학생B",
        },
        {
            id: "rev-3",
            menuName: "돈까스",
            rating: 2,
            comment: "양은 많은데 맛이 예전만 못해요.",
            createdAt: "2026-02-13T12:15:00Z",
            userName: "학생C",
        },
    ];

    return {
        filter,
        periodLabel: label,
        kpi,
        insights,
        dailyRevenue,
        hourlyDistribution,
        venuePerformance,
        efficiency,
        recommendations,
        menuPerformance,
        reviews,
    };
}

// Helper for CSV export
export function exportToCSV(data: VenuePerformance[]): string {
    const headers = ["구분", "이름", "매출(원)", "건수", "객단가(원)", "점유율(%)"];
    const rows = data.map(v => [
        v.type === "restaurant" ? "식당" : "코너",
        v.name,
        v.revenue.toLocaleString(),
        v.transactions.toLocaleString(),
        v.avgTicketSize.toLocaleString(),
        v.marketShare.toFixed(1),
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    return csv;
}

export function downloadCSV(filename: string, csvContent: string) {
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
