import { useState, useMemo } from "react";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { ExecutiveSummary } from "../components/reports/ExecutiveSummary";
import { MenuMatrix } from "../components/reports/MenuMatrix";
import {
    ReportFilter,
    WeekRange,
    ViewMode,
    ReportScope,
    WEEK_RANGE_LABELS,
    VIEW_MODE_LABELS,
    MenuPerformance,
    MenuReview,
    VenuePerformance,
    Recommendation,
} from "../data/reportModel";
import { generateMockReport, exportToCSV, downloadCSV } from "../data/mockReportData";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Download, FileText, RefreshCw, AlertCircle, TrendingUp, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

export default function ReportsPage() {
    const [filter, setFilter] = useState<ReportFilter>({
        weekRange: WeekRange.THIS_WEEK,
        scope: ReportScope.ALL,
        viewMode: ViewMode.EXECUTIVE,
    });

    const [isLoading, setIsLoading] = useState(false);
    const [selectedMenu, setSelectedMenu] = useState<MenuPerformance | null>(null);
    const [showReviewDialog, setShowReviewDialog] = useState(false);

    // Generate report data based on filter
    const report = useMemo(() => generateMockReport(filter), [filter]);

    const handleFilterChange = (key: keyof ReportFilter, value: any) => {
        setFilter(prev => ({ ...prev, [key]: value }));
    };

    const handleRefresh = () => {
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 800);
    };

    const handleExportCSV = () => {
        const csv = exportToCSV(report.venuePerformance);
        const filename = `성과리포트_${report.periodLabel.replace(/\./g, "")}.csv`;
        downloadCSV(filename, csv);
    };

    const handleMenuClick = (menu: MenuPerformance) => {
        setSelectedMenu(menu);
        setShowReviewDialog(true);
    };

    const priorityColor = (priority: string) => {
        switch (priority) {
            case "high": return "text-red-600 bg-red-50";
            case "medium": return "text-orange-600 bg-orange-50";
            case "low": return "text-blue-600 bg-blue-50";
            default: return "text-gray-600 bg-gray-50";
        }
    };

    return (
        <div className="space-y-4 pb-8">
            {/* Page Header */}
            <AdminPageHeader
                title="리포트"
                subtitle="주간 운영 성과 (결제·이용·메뉴·만족도)를 요약합니다"
                onRefresh={handleRefresh}
                isLoading={isLoading}
            />

            {/* Global Filter Bar */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Week Range */}
                    <Select
                        value={filter.weekRange}
                        onValueChange={(value) => handleFilterChange("weekRange", value as WeekRange)}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(WEEK_RANGE_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* View Mode */}
                    <Select
                        value={filter.viewMode}
                        onValueChange={(value) => handleFilterChange("viewMode", value as ViewMode)}
                    >
                        <SelectTrigger className="w-52">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(VIEW_MODE_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Scope Selector */}
                    <Select
                        value={filter.scope}
                        onValueChange={(value) => handleFilterChange("scope", value as ReportScope)}
                    >
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="범위 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ReportScope.ALL}>전체</SelectItem>
                            <SelectItem value={ReportScope.RESTAURANT}>식당별</SelectItem>
                            <SelectItem value={ReportScope.CORNER}>코너별</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Reset Button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilter({
                            weekRange: WeekRange.THIS_WEEK,
                            scope: ReportScope.ALL,
                            viewMode: ViewMode.EXECUTIVE,
                        })}
                        className="h-9 px-3 text-gray-500 hover:text-gray-900"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        필터 초기화
                    </Button>

                    {/* Export Buttons */}
                    <div className="ml-auto flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportCSV}
                            className="h-9"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            CSV 내보내기
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="h-9"
                            title="추후 제공"
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            PDF (준비중)
                        </Button>
                    </div>
                </div>

                {/* Period Label */}
                <div className="text-sm text-gray-600">
                    📅 분석 기간: <span className="font-semibold">{report.periodLabel}</span>
                </div>
            </div>

            {/* Executive Summary */}
            <ExecutiveSummary kpi={report.kpi} insights={report.insights} />

            {/* Revenue & Tickets Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">매출 & 거래 분석</h2>

                {/* Daily Revenue Chart */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">일별 매출 & 거래 추이</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={report.dailyRevenue}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="dayOfWeek" tick={{ fontSize: 12 }} />
                            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="revenue"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                name="매출 (원)"
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="transactions"
                                stroke="#10b981"
                                strokeWidth={2}
                                name="거래 건수"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Hourly Distribution */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">시간대별 거래 분포</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={report.hourlyDistribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="hour" tick={{ fontSize: 12 }} label={{ value: "시간", position: "insideBottom", offset: -5 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="transactions" fill="#6366f1" name="거래 건수" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Venue Performance Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900">식당/코너별 성과</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">구분</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">이름</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">매출</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">건수</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">객단가</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">점유율</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {report.venuePerformance.map((venue) => (
                                    <tr key={venue.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-xs font-medium",
                                                venue.type === "restaurant" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                                            )}>
                                                {venue.type === "restaurant" ? "식당" : "코너"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{venue.name}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-700 font-mono">
                                            ₩{venue.revenue.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                                            {venue.transactions.toLocaleString()}건
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-700 font-mono">
                                            ₩{venue.avgTicketSize.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right">
                                            <span className="font-semibold text-gray-900">
                                                {venue.marketShare.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-3 bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
                        💡 현재는 mock/추정 데이터입니다. 결제 이벤트 연동 시 실제 데이터가 제공됩니다.
                    </div>
                </div>
            </div>

            {/* Operations Efficiency Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">운영 효율</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Peak Concentration */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-5 h-5 text-orange-600" />
                            <h3 className="text-sm font-semibold text-gray-900">피크 집중도</h3>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-orange-600">
                                    {report.efficiency.peakConcentration.concentrationRate.toFixed(1)}%
                                </span>
                                <span className="text-sm text-gray-500">상위 20% 시간대 집중</span>
                            </div>
                            <div className="text-xs text-gray-600 mt-2">
                                피크: {report.efficiency.peakConcentration.top20PercentHours.join(", ")}
                            </div>
                        </div>
                    </div>

                    {/* Avg Throughput */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Users className="w-5 h-5 text-blue-600" />
                            <h3 className="text-sm font-semibold text-gray-900">시간당 평균 처리량</h3>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-blue-600">
                                    {Math.round(report.kpi.totalTransactions / 13)}
                                </span>
                                <span className="text-sm text-gray-500">건/시간</span>
                            </div>
                            <div className="text-xs text-gray-600 mt-2">
                                운영시간 기준 (7:00-19:00)
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recommendations */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">🎯 권장 조치사항</h3>
                    <div className="space-y-3">
                        {report.recommendations.map((rec) => (
                            <div
                                key={rec.id}
                                className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                            >
                                <div className="shrink-0 mt-0.5">
                                    <div className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                        priorityColor(rec.priority)
                                    )}>
                                        {rec.priority === "high" ? "!" : rec.priority === "medium" ? "•" : "·"}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 mb-1">
                                        {rec.title}
                                    </p>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        {rec.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Menu Performance & Quality */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">메뉴 성과 & 품질</h2>

                {/* Menu Matrix */}
                <MenuMatrix menuData={report.menuPerformance} onMenuClick={handleMenuClick} />

                {/* Menu Performance Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900">메뉴별 상세 성과</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">메뉴명</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">코너</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">판매</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">점유율</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">별점</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">리뷰</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">상태</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {report.menuPerformance.map((menu) => (
                                    <tr
                                        key={menu.menuId}
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => handleMenuClick(menu)}
                                    >
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{menu.menuName}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{menu.cornerName}</td>
                                        <td className="px-4 py-3 text-sm text-right">{menu.sales}건</td>
                                        <td className="px-4 py-3 text-sm text-right">{menu.marketShare.toFixed(1)}%</td>
                                        <td className="px-4 py-3 text-sm text-right">
                                            <span className={cn(
                                                "font-semibold",
                                                menu.avgRating >= 4.0 ? "text-green-600" : menu.avgRating >= 3.0 ? "text-orange-600" : "text-red-600"
                                            )}>
                                                {menu.avgRating.toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-600">{menu.reviewCount}</td>
                                        <td className="px-4 py-3 text-center">
                                            {menu.status && (
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-xs font-medium",
                                                    menu.status === "star" && "bg-green-100 text-green-700",
                                                    menu.status === "high_sales_low_rating" && "bg-red-100 text-red-700",
                                                    menu.status === "low_sales_high_rating" && "bg-blue-100 text-blue-700",
                                                    menu.status === "underperformer" && "bg-gray-100 text-gray-700"
                                                )}>
                                                    {menu.status === "star" && "강력추천"}
                                                    {menu.status === "high_sales_low_rating" && "즉시개선"}
                                                    {menu.status === "low_sales_high_rating" && "숨은보석"}
                                                    {menu.status === "underperformer" && "정리후보"}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Review Dialog */}
            <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedMenu?.menuName} - 최근 리뷰
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {report.reviews
                            ?.filter(r => r.menuName === selectedMenu?.menuName)
                            .slice(0, 5)
                            .map((review) => (
                                <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-gray-900">
                                                {review.userName || "익명"}
                                            </span>
                                            <div className="flex items-center">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <span
                                                        key={i}
                                                        className={cn(
                                                            "text-sm",
                                                            i < review.rating ? "text-yellow-400" : "text-gray-300"
                                                        )}
                                                    >
                                                        ★
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {new Date(review.createdAt).toLocaleDateString("ko-KR")}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        {review.comment}
                                    </p>
                                </div>
                            ))}
                        {(!report.reviews || report.reviews.filter(r => r.menuName === selectedMenu?.menuName).length === 0) && (
                            <div className="text-center py-8 text-gray-500 text-sm">
                                아직 리뷰가 없습니다
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
