import { KPISummary, Insight } from "../../data/reportModel";
import { TrendingUp, TrendingDown, Minus, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ExecutiveSummaryProps {
    kpi: KPISummary;
    insights: Insight[];
}

export function ExecutiveSummary({ kpi, insights }: ExecutiveSummaryProps) {
    const [copied, setCopied] = useState(false);

    const handleCopySummary = () => {
        const text = [
            `📊 주간 운영 요약`,
            ``,
            `💰 총 결제액: ${kpi.totalRevenue.toLocaleString()}원`,
            `📝 총 건수: ${kpi.totalTransactions.toLocaleString()}건`,
            `💳 객단가: ${kpi.avgTicketSize.toLocaleString()}원`,
            `⭐ Top 코너: ${kpi.topCorner.name} (${kpi.topCorner.value.toLocaleString()})`,
            `😊 만족도: ${kpi.satisfaction.avgRating}/5.0 (${kpi.satisfaction.reviewCount}건)`,
            ``,
            `📌 주요 인사이트:`,
            ...insights.map((insight, i) => `${i + 1}. ${insight.message}`),
        ].join("\n");

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* Total Revenue */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">총 결제액</p>
                    <p className="text-2xl font-bold text-gray-900">
                        ₩{(kpi.totalRevenue / 1_000_000).toFixed(1)}M
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {kpi.totalRevenue.toLocaleString()}원
                    </p>
                </div>

                {/* Total Transactions */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">총 건수</p>
                    <p className="text-2xl font-bold text-gray-900">
                        {kpi.totalTransactions.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">건</p>
                </div>

                {/* Avg Ticket Size */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">객단가</p>
                    <p className="text-2xl font-bold text-gray-900">
                        ₩{kpi.avgTicketSize.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">원/건</p>
                </div>

                {/* Top Corner */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Top 코너</p>
                    <p className="text-lg font-bold text-gray-900 truncate">
                        {kpi.topCorner.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {kpi.topCorner.value.toLocaleString()}건
                    </p>
                </div>

                {/* Satisfaction */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">만족도</p>
                    <div className="flex items-baseline gap-1">
                        <p className="text-2xl font-bold text-gray-900">
                            {kpi.satisfaction.avgRating.toFixed(1)}
                        </p>
                        <p className="text-sm text-gray-500">/5.0</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        {kpi.satisfaction.reviewCount}건 리뷰
                    </p>
                </div>

                {/* Issue Count */}
                {kpi.issueCount !== undefined && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">이슈</p>
                        <p className={cn(
                            "text-2xl font-bold",
                            kpi.issueCount > 0 ? "text-red-600" : "text-green-600"
                        )}>
                            {kpi.issueCount}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {kpi.issueCount > 0 ? "개선 필요" : "정상"}
                        </p>
                    </div>
                )}
            </div>

            {/* Insights Box */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                        📌 이번 주 요약 (주요 인사이트)
                    </h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopySummary}
                        className="h-7 px-2 text-xs hover:bg-white/50"
                    >
                        {copied ? (
                            <>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" />
                                복사됨
                            </>
                        ) : (
                            <>
                                <Copy className="w-3.5 h-3.5 mr-1" />
                                회의용 복사
                            </>
                        )}
                    </Button>
                </div>

                <div className="space-y-2">
                    {insights.map((insight) => (
                        <div
                            key={insight.id}
                            className="flex items-start gap-2 bg-white/60 rounded p-2.5"
                        >
                            <div className="mt-0.5 shrink-0">
                                {insight.type === "positive" && (
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                )}
                                {insight.type === "negative" && (
                                    <TrendingDown className="w-4 h-4 text-red-600" />
                                )}
                                {insight.type === "neutral" && (
                                    <Minus className="w-4 h-4 text-gray-600" />
                                )}
                            </div>
                            <p className="text-sm text-gray-800 leading-snug">
                                {insight.message}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
