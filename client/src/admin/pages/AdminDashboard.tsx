import { useState, useEffect } from "react";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { Scoreboard } from "../components/dashboard/Scoreboard";
import { BottleneckSpotlight } from "../components/dashboard/BottleneckSpotlight";
import { OpsWorkbench } from "../components/dashboard/OpsWorkbench";
import { fetchDashboardDataV2, DashboardDataV2 } from "../data/mockDashboardDataV2";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
    const [data, setData] = useState<DashboardDataV2 | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const loadData = async () => {
        setIsLoading(true);
        try {
            const result = await fetchDashboardDataV2();
            setData(result);
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

    // Safe destructuring with default values for initial render
    const kpis = data?.kpis || [];
    const goals = data?.goals || [];
    const bottlenecks = data?.bottlenecks || [];
    const demandCapacity = data?.demandCapacity || { arrivalRate: 0, capacity: 0, gap: 0 };

    return (
        <div className="space-y-6 pb-8 min-h-screen bg-gray-50/50">
            {/* Header */}
            <DashboardHeader
                title="한양대학교 식당"
                subtitle="실시간 운영 현황 (Live)"
                lastSync={data?.lastSync}
                onRefresh={handleRefresh}
                isLoading={isLoading}
            />

            {/* Section A: Today Scoreboard (Where/Status) */}
            <Scoreboard
                kpis={kpis}
                goals={goals}
                isLoading={isLoading}
            />

            {/* Section B: Bottleneck Spotlight (Why/Problem) */}
            <BottleneckSpotlight
                bottlenecks={bottlenecks}
                demandCapacity={demandCapacity}
                isLoading={isLoading}
            />

            {/* Section C: Ops Workbench (What/Action) */}
            {data && (
                <OpsWorkbench
                    data={data}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
}
