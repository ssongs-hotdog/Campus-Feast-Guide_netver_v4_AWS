import { Card, CardContent } from "@/components/ui/card";
import { Users, Clock, AlertTriangle, Activity } from "lucide-react";
import { MonitoringKpi } from "@/admin/data/mockMonitoringData";

interface GenericKpiCardProps {
    title: string;
    value: string | number;
    unit?: string;
    icon: any;
    trend?: string;
    trendDir?: "up" | "down" | "neutral";
    colorClass?: string;
}

function KpiCard({ title, value, unit, icon: Icon, trend, trendDir, colorClass = "text-gray-900" }: GenericKpiCardProps) {
    return (
        <Card className="shadow-sm border-gray-200">
            <CardContent className="p-4 flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                    <div className="flex items-baseline gap-1">
                        <h3 className={`text-2xl font-bold ${colorClass}`}>{value}</h3>
                        {unit && <span className="text-sm text-gray-500">{unit}</span>}
                    </div>
                    {trend && (
                        <p className={`text-xs mt-1 ${trendDir === 'up' ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {trend}
                        </p>
                    )}
                </div>
                <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
                    <Icon size={20} />
                </div>
            </CardContent>
        </Card>
    );
}

export function MonitoringKpiCards({ kpi }: { kpi: MonitoringKpi }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
                title="혼잡 코너"
                value={kpi.congestedCount}
                unit="개"
                icon={Users}
                colorClass={kpi.congestedCount > 0 ? "text-rose-600" : "text-gray-900"}
                trend={kpi.congestedCount > 0 ? "집중 관리 필요" : "매우 양호"}
                trendDir={kpi.congestedCount > 0 ? "up" : "neutral"}
            />
            <KpiCard
                title="평균 예상 대기"
                value={kpi.avgWaitMin}
                unit="분"
                icon={Clock}
            />
            <KpiCard
                title="최대 대기 시간"
                value={kpi.maxWaitMin}
                unit="분"
                icon={Activity}
                colorClass={kpi.maxWaitMin >= 20 ? "text-amber-600" : "text-gray-900"}
            />
            <KpiCard
                title="업데이트 지연"
                value={kpi.updateDelayCount}
                unit="개"
                icon={AlertTriangle}
                colorClass={kpi.updateDelayCount > 0 ? "text-rose-500" : "text-gray-900"}
            />
        </div>
    );
}
