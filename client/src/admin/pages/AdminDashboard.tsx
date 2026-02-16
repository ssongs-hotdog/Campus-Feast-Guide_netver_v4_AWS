import { useState, useEffect } from "react";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { KpiStatsGrid } from "../components/dashboard/KpiStatsGrid";
import { HotspotsTable } from "../components/dashboard/HotspotsTable";
import { QuickActions } from "../components/dashboard/QuickActions";
import { fetchDashboardData, DashboardStats, CornerStatus } from "../data/mockDashboardData";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [hotspots, setHotspots] = useState<CornerStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await fetchDashboardData();
            setStats(data.stats);
            setHotspots(data.hotspots);
        } catch (error) {
            console.error("Dashboard data fetch failed", error);
            toast({
                title: "데이터 로딩 실패",
                description: "대시보드 데이터를 불러오지 못했습니다.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleRefresh = () => {
        loadData();
        toast({
            title: "새로고침 완료",
            description: "최신 데이터로 업데이트되었습니다."
        });
    };

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <DashboardHeader
                title="대시보드"
                subtitle="운영 현황 요약 및 빠른 대응"
                lastSync={stats?.lastSync}
                onRefresh={handleRefresh}
                isLoading={isLoading}
            />

            {/* KPI Cards */}
            <KpiStatsGrid stats={stats} isLoading={isLoading} />

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Hotspots Table (Takes 2 columns) */}
                <div className="lg:col-span-2 h-full">
                    <HotspotsTable hotspots={hotspots} isLoading={isLoading} />
                </div>

                {/* Right: Quick Actions (Takes 1 column) */}
                <div className="h-full">
                    <QuickActions />
                </div>
            </div>
        </div>
    );
}
