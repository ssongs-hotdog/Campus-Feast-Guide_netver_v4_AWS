import { useState, useEffect } from "react";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { Scoreboard } from "../components/dashboard/Scoreboard";
import { BottleneckSpotlight } from "../components/dashboard/BottleneckSpotlight";
import { OpsWorkbench } from "../components/dashboard/OpsWorkbench";
import { fetchDashboardDataV2, DashboardDataV2 } from "../data/mockDashboardDataV2";
import { useToast } from "@/hooks/use-toast";
import { RESTAURANTS } from "../data/mock_canonical";
import { ChevronDown } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
    const [data, setData] = useState<DashboardDataV2 | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRestaurant, setSelectedRestaurant] = useState<string>("all");
    const [autoRefresh, setAutoRefresh] = useState(true);
    const { toast } = useToast();

    const loadData = async () => {
        setIsLoading(true);
        try {
            const result = await fetchDashboardDataV2(selectedRestaurant);
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
    }, [selectedRestaurant]); // Reload when filter changes

    // Auto Refresh Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (autoRefresh) {
            interval = setInterval(() => {
                loadData();
            }, 30000); // 30s auto refresh
        }
        return () => clearInterval(interval);
    }, [autoRefresh, selectedRestaurant]);

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
        <div className="space-y-4 pb-8">
            {/* Standard Header */}
            <AdminPageHeader
                title="대시보드"
                subtitle="실시간 운영 현황과 주요 지표를 한눈에 파악합니다."
                lastUpdated={data?.lastSync ? new Date(data.lastSync) : undefined}
                onRefresh={handleRefresh}
                isLoading={isLoading}
                autoRefresh={autoRefresh}
                onAutoRefreshChange={setAutoRefresh}
            />

            {/* Restaurant Selector (Kept separate as requested) */}
            <div className="flex items-center gap-2">
                <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                    <SelectTrigger
                        className={cn(
                            "h-auto py-2 px-3 border border-transparent bg-transparent shadow-none hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all rounded-md w-auto gap-2 focus:ring-1 focus:ring-offset-0 focus:ring-blue-100",
                            "[&>svg]:hidden" // Hide default duplicate chevron if generic component adds one, enforcing custom layout if needed OR simplified below
                        )}
                    // Note: SelectTrigger in shadcn usually renders an Icon automatically. 
                    // Ideally we just style the trigger and let it render text + icon.
                    // If we want to style the TEXT as H2, we can do it via className or children.
                    >
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-gray-800 tracking-tight leading-none text-left">
                                <SelectValue placeholder="식당 선택" />
                            </h2>
                            {/* We deliberately render the icon here for size control, forcing default one hidden via CSS if dual icons appear */}
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                        </div>
                    </SelectTrigger>
                    <SelectContent align="start" className="min-w-[280px]">
                        <SelectItem value="all" className="font-medium py-3">한양대학교 서울캠퍼스 전체 식당</SelectItem>
                        {RESTAURANTS.map((restaurant) => (
                            <SelectItem key={restaurant.id} value={restaurant.id} className="py-2.5">
                                {restaurant.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

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
