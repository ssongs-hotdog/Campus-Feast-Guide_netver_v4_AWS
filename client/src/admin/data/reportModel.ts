// Report data model and types for weekly performance analytics

export enum WeekRange {
    THIS_WEEK = "this_week",
    LAST_WEEK = "last_week",
    LAST_4_WEEKS = "last_4_weeks",
    CUSTOM = "custom",
}

export enum ViewMode {
    EXECUTIVE = "executive",  // 학교용 (간결)
    DETAIL = "detail",        // 운영자용 (상세)
}

export enum ReportScope {
    ALL = "all",
    RESTAURANT = "restaurant",
    CORNER = "corner",
}

export interface ReportFilter {
    weekRange: WeekRange;
    customStart?: string;
    customEnd?: string;
    scope: ReportScope;
    restaurantId?: string;
    cornerId?: string;
    viewMode: ViewMode;
}

export interface KPISummary {
    totalRevenue: number;        // 총 결제액
    totalTransactions: number;   // 총 건수
    avgTicketSize: number;       // 객단가
    topCorner: {
        name: string;
        value: number;           // 매출 또는 건수
    };
    satisfaction: {
        avgRating: number;       // 평균 별점
        reviewCount: number;     // 리뷰 수
    };
    issueCount?: number;         // 이슈 수 (별점 급락 등)
}

export interface Insight {
    id: string;
    type: "positive" | "negative" | "neutral";
    message: string;
}

export interface DailyRevenue {
    date: string;                // YYYY-MM-DD
    dayOfWeek: string;           // 월, 화, 수...
    revenue: number;
    transactions: number;
}

export interface HourlyDistribution {
    hour: number;                // 0-23
    transactions: number;
    revenue: number;
}

export interface VenuePerformance {
    id: string;
    name: string;
    type: "restaurant" | "corner";
    revenue: number;
    transactions: number;
    avgTicketSize: number;
    marketShare: number;         // 점유율 (%)
}

export interface EfficiencyMetrics {
    hourlyThroughput: {
        hour: number;
        transactionsPerHour: number;
    }[];
    peakConcentration: {
        top20PercentHours: string[];  // 피크 시간대
        concentrationRate: number;     // 상위 20%가 차지하는 비율
    };
}

export interface Recommendation {
    id: string;
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    category: "staffing" | "operations" | "menu" | "quality";
}

export interface MenuPerformance {
    menuId: string;
    menuName: string;
    cornerName: string;
    sales: number;               // 판매건수 또는 매출
    marketShare: number;         // 점유율
    avgRating: number;
    reviewCount: number;
    status?: "high_sales_low_rating" | "low_sales_high_rating" | "star" | "underperformer";
}

export interface MenuReview {
    id: string;
    menuName: string;
    rating: number;
    comment: string;
    createdAt: string;
    userName?: string;
}

export interface WeeklyReport {
    filter: ReportFilter;
    periodLabel: string;         // "2026.02.10 - 2026.02.16"
    kpi: KPISummary;
    insights: Insight[];
    dailyRevenue: DailyRevenue[];
    hourlyDistribution: HourlyDistribution[];
    venuePerformance: VenuePerformance[];
    efficiency: EfficiencyMetrics;
    recommendations: Recommendation[];
    menuPerformance: MenuPerformance[];
    reviews?: MenuReview[];
}

export const WEEK_RANGE_LABELS: Record<WeekRange, string> = {
    [WeekRange.THIS_WEEK]: "이번주",
    [WeekRange.LAST_WEEK]: "지난주",
    [WeekRange.LAST_4_WEEKS]: "최근 4주",
    [WeekRange.CUSTOM]: "기간 설정",
};

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
    [ViewMode.EXECUTIVE]: "학교용 (Executive)",
    [ViewMode.DETAIL]: "운영자용 (Detail)",
};

export const REPORT_SCOPE_LABELS: Record<ReportScope, string> = {
    [ReportScope.ALL]: "전체",
    [ReportScope.RESTAURANT]: "식당별",
    [ReportScope.CORNER]: "코너별",
};
