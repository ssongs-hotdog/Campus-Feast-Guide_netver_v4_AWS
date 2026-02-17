import { DashboardStats } from "../../data/mockDashboardData";
import { Users, Clock, AlertTriangle, Activity } from "lucide-react";

interface KpiStatsGridProps {
    stats: DashboardStats | null;
    isLoading: boolean;
}

export function KpiStatsGrid({ stats, isLoading }: KpiStatsGridProps) {
    const SkeletonCard = () => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-pulse">
            <div className="h-4 w-24 bg-gray-100 rounded mb-3"></div>
            <div className="h-8 w-16 bg-gray-200 rounded"></div>
        </div>
    );

    if (isLoading || !stats) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
            </div>
        );
    }

    const cards = [
        {
            label: "혼잡 코너 수",
            value: `${stats.busyCorners}개`,
            icon: Users,
            color: stats.busyCorners > 0 ? "text-red-600" : "text-gray-900",
            subtext: `전체 ${stats.activeCorners}개 중`
        },
        {
            label: "평균 예상 대기",
            value: `${stats.avgWaitTime}분`,
            icon: Clock,
            color: "text-[#0E4A84]",
            subtext: "전체 코너 평균"
        },
        {
            label: "최대 예상 대기",
            value: `${stats.maxWaitTime}분`,
            icon: AlertTriangle,
            color: stats.maxWaitTime > 20 ? "text-red-600" : "text-[#0E4A84]",
            subtext: "가장 혼잡한 코너 기준"
        },
        {
            label: "시스템 상태",
            value: stats.systemStatus === 'normal' ? '정상' : '주의',
            icon: Activity,
            color: stats.systemStatus === 'normal' ? "text-green-600" : "text-yellow-600",
            subtext: "모든 서비스 가동 중"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, idx) => {
                const Icon = card.icon;
                return (
                    <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-sm font-medium text-gray-500">{card.label}</h3>
                            <Icon className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className={`text-3xl font-bold mt-1 mb-1 ${card.color}`}>{card.value}</p>
                        <p className="text-xs text-gray-400">{card.subtext}</p>
                    </div>
                );
            })}
        </div>
    );
}
