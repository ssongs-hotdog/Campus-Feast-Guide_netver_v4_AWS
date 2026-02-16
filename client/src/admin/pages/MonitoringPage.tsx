import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { AdminPageHeader } from "../components/AdminPageHeader";
import {
    MonitoringCornerStatus,
    MOCK_MONITORING_DATA,
    computeMonitoringKpis
} from "../data/mockMonitoringData";
import { RESTAURANTS } from "../data/mock_canonical";
import { MonitoringKpiCards } from "../components/monitoring/MonitoringKpiCards";
import { MonitoringFilterBar } from "../components/monitoring/MonitoringFilterBar";
import { MonitoringTable } from "../components/monitoring/MonitoringTable";
import { ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function MonitoringPage() {
    const [selectedRestaurant, setSelectedRestaurant] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [onlyCongested, setOnlyCongested] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [_, setLocation] = useLocation();

    const { toast } = useToast();

    // Data Filtering Logic
    const filteredData = useMemo(() => {
        let data = MOCK_MONITORING_DATA;

        if (selectedRestaurant !== "all") {
            data = data.filter(d => d.restaurantId === selectedRestaurant);
        }

        if (onlyCongested) {
            data = data.filter(d => d.status === "congested");
        } else if (statusFilter !== "all") {
            data = data.filter(d => d.status === statusFilter);
        }

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            data = data.filter(d =>
                d.cornerName.toLowerCase().includes(lowerTerm) ||
                d.restaurantName.toLowerCase().includes(lowerTerm)
            );
        }

        // Default Sort: Wait Time Descending (Hotspots first) - as requested
        return [...data].sort((a, b) => b.estWaitTimeMin - a.estWaitTimeMin);
    }, [selectedRestaurant, searchTerm, statusFilter, onlyCongested, lastUpdated]);

    const kpis = useMemo(() => computeMonitoringKpis(filteredData), [filteredData]);

    const handleRefresh = () => {
        setLastUpdated(new Date());
        toast({
            title: "데이터 갱신 완료",
            description: "최신 모니터링 데이터로 업데이트되었습니다."
        });
    };

    const handleRowClick = (corner: MonitoringCornerStatus) => {
        // ONE CLICK NAVIGATION
        // Route: /admin/monitoring/corners/:restaurantId/:cornerId
        setLocation(`/admin/monitoring/corners/${corner.restaurantId}/${corner.id}`);
    };

    const handleResetFilters = () => {
        setSearchTerm("");
        setStatusFilter("all");
        setOnlyCongested(false);
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (autoRefresh) {
            interval = setInterval(() => {
                setLastUpdated(new Date());
            }, 30000);
        }
        return () => clearInterval(interval);
    }, [autoRefresh]);

    return (
        <div className="space-y-4 pb-8">
            <AdminPageHeader
                title="실시간 모니터링"
                subtitle="전체 코너의 대기·상태를 실시간으로 관제합니다."
                lastUpdated={lastUpdated}
                onRefresh={handleRefresh}
                autoRefresh={autoRefresh}
                onAutoRefreshChange={setAutoRefresh}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                            <SelectTrigger
                                className={cn(
                                    "h-auto py-2 px-3 border border-transparent bg-transparent shadow-none hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all rounded-md w-auto gap-2 focus:ring-1 focus:ring-offset-0 focus:ring-blue-100",
                                    "[&>svg]:hidden"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold text-gray-800 tracking-tight leading-none text-left">
                                        <SelectValue placeholder="식당 선택" />
                                    </h2>
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
                </div>
            </div>

            <MonitoringKpiCards kpi={kpis} />

            <div className="space-y-4">
                <MonitoringFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    statusFilter={statusFilter}
                    onStatusChange={setStatusFilter}
                    onlyCongested={onlyCongested}
                    onCongestedChange={setOnlyCongested}
                    onReset={handleResetFilters}
                />
                <MonitoringTable
                    data={filteredData}
                    onRowClick={handleRowClick}
                />
            </div>
        </div>
    );
}
