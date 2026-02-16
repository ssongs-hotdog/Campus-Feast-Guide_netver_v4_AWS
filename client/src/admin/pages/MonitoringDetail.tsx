import { useState, useMemo } from "react";
import { Link, useRoute } from "wouter";
import {
    MOCK_MONITORING_DATA,
    getMonitoringHistory,
    getMonitoringEvents
} from "../data/mockMonitoringData";
import { RESTAURANTS, CORNERS } from "../data/mock_canonical";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ArrowLeft, Clock, History, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";

export default function MonitoringDetail() {
    const [match, params] = useRoute("/admin/monitoring/corners/:restaurantId/:cornerId");

    // Derived State from URL
    const restaurantId = match ? params?.restaurantId : "all";
    const cornerId = match ? params?.cornerId : "";

    // Local State for Selectors (to drive navigation)
    // We don't need local state for data if we just navigate on change
    // But to show "All" in restaurant selector while viewing a specific corner, we need logic.

    const currentCorner = MOCK_MONITORING_DATA.find(c => c.id === cornerId);

    // Helpers for Navigation
    const setLocation = (path: string) => {
        window.location.hash = path; // Wouter hash router support implies simplified nav usually, but here we use standard Link or window location logic if needed. 
        // Actually wouter uses pushState by default unless configured otherwise. 
        // Let's assume standard interaction given we are inside a Router.
        // We will use a hacky way or just use Link components if possible, 
        // but for Select onValueChange we need programmatic navigation.
        // Since we don't have the hook exposed easily here without import, 
        // we'll assume standard window.history.pushState or similar wrapped in a hook if available.
        // Re-checking imports... `useLocation` from wouter returns [location, setLocation].
    };

    // We need useLocation from wouter
    const [location, setLocationWouter] = require("wouter").useLocation();

    const handleRestaurantChange = (val: string) => {
        // If "all" selected, go back to list? Or stay? 
        // User said: "If a specific restaurant is selected: list ONLY that restaurant’s corners."
        // "If '전체 식당(all)' is selected: list all corners, grouped by restaurant in the dropdown."

        if (val === "all") {
            // If switching to ALL, we technically stay on a detail page but maybe we just reset the specific restaurant context?
            // Actually, the prompt says "Changing selection updates the displayed data and also updates the URL to match the selected corner."
            // This implies the selectors are for CHANGING the CURRENT corner.
            // If I change restaurant to "Materials", the Corner Selector should filter to Materials corners.
            // Auto-select the first one? Or wait for user?
            // Let's auto-select the first corner of the new restaurant to keep it simple.
            const firstCorner = CORNERS.find(c => c.restaurantId === val);
            if (firstCorner) {
                setLocationWouter(`/admin/monitoring/corners/${val}/${firstCorner.id}`);
            }
        } else {
            const firstCorner = CORNERS.find(c => c.restaurantId === val);
            if (firstCorner) {
                setLocationWouter(`/admin/monitoring/corners/${val}/${firstCorner.id}`);
            }
        }
    };

    const handleCornerChange = (val: string) => {
        const corner = CORNERS.find(c => c.id === val);
        if (corner) {
            setLocationWouter(`/admin/monitoring/corners/${corner.restaurantId}/${corner.id}`);
        }
    };

    // Filtered Options
    const filteredCorners = useMemo(() => {
        if (!restaurantId || restaurantId === "all") return CORNERS;
        return CORNERS.filter(c => c.restaurantId === restaurantId);
    }, [restaurantId]);

    // Trend Data
    const trendData = useMemo(() => {
        if (!cornerId) return [];
        return getMonitoringHistory(cornerId);
    }, [cornerId]);

    const events = useMemo(() => {
        if (!cornerId) return [];
        return getMonitoringEvents(cornerId);
    }, [cornerId]);

    if (!currentCorner) {
        return <div className="p-8 text-center">코너 정보를 찾을 수 없습니다.</div>;
    }

    return (
        <div className="space-y-6 pb-8 max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Link href="/admin/monitoring" className="hover:text-blue-600 transition-colors">실시간 모니터링</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="font-medium text-gray-900">코너 상세보기</span>
            </div>

            {/* Header & Selectors */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => setLocationWouter("/admin/monitoring")}>
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Button>

                    <div className="flex gap-2">
                        <Select value={restaurantId} onValueChange={handleRestaurantChange}>
                            <SelectTrigger className="w-[180px] bg-white border-gray-200">
                                <SelectValue placeholder="식당 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">전체 식당</SelectItem>
                                {RESTAURANTS.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={cornerId} onValueChange={handleCornerChange}>
                            <SelectTrigger className="w-[200px] bg-white border-gray-200 font-bold text-gray-900">
                                <SelectValue placeholder="코너 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredCorners.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-xs text-gray-400">마지막 업데이트</div>
                    <div className="font-mono text-sm text-gray-600">{new Date(currentCorner.lastUpdatedAt).toLocaleTimeString()}</div>
                </div>
            </div>

            {/* Content Blocks */}

            {/* 1. Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="shadow-sm border-gray-200 bg-white">
                    <CardContent className="p-4">
                        <div className="text-sm text-gray-500 mb-1">현재 상태</div>
                        <Badge variant="outline" className={cn(
                            "px-3 py-1 text-base",
                            currentCorner.status === 'congested' ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        )}>
                            {currentCorner.status === 'congested' ? '혼잡' : '원활'}
                        </Badge>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-gray-200 bg-white">
                    <CardContent className="p-4">
                        <div className="text-sm text-gray-500 mb-1">예상 대기</div>
                        <div className="text-2xl font-bold font-mono">
                            {currentCorner.estWaitTimeMin} <span className="text-sm font-normal text-gray-500">분</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-gray-200 bg-white">
                    <CardContent className="p-4">
                        <div className="text-sm text-gray-500 mb-1">신뢰도</div>
                        <div className="text-2xl font-bold font-mono text-emerald-600">
                            {currentCorner.reliabilityPct}%
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-gray-200 bg-white">
                    <CardContent className="p-4">
                        <div className="text-sm text-gray-500 mb-1">업데이트 지연</div>
                        <div className={cn("text-2xl font-bold font-mono", currentCorner.updateDelayMin > 10 ? "text-rose-600" : "text-gray-900")}>
                            {currentCorner.updateDelayMin} <span className="text-sm font-normal text-gray-500">분</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 2. Charts & Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Chart Area */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="shadow-sm border-gray-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <History className="w-4 h-4 text-gray-500" />
                                최근 1시간 대기 인원 현황
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="queueCount"
                                            name="대기 인원"
                                            stroke="#3b82f6"
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-gray-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                최근 1시간 예상 대기 시간 추이
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} unit="분" />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="waitTimeMin"
                                            name="예상 대기(분)"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Panel: Info & Logs */}
                <div className="space-y-6">
                    <Card className="shadow-sm border-gray-200 bg-slate-50">
                        <CardHeader className="pb-2 border-b border-gray-100">
                            <CardTitle className="text-sm font-bold text-gray-700">운영 정보</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">운영 시간</span>
                                <span className="font-semibold text-gray-900">{currentCorner.operatingHours}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">코너 ID</span>
                                <code className="bg-white px-2 py-0.5 rounded border border-gray-200 text-xs">{currentCorner.id}</code>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-gray-200">
                        <CardHeader className="pb-2 border-b border-gray-100">
                            <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> 최근 이벤트 로그
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <ul className="space-y-4">
                                {events.map(evt => (
                                    <li key={evt.id} className="relative pl-4 border-l-2 border-gray-200">
                                        <div className="text-xs text-gray-400 mb-0.5">
                                            {new Date(evt.timestamp).toLocaleTimeString()}
                                        </div>
                                        <div className="text-sm text-gray-800 font-medium">
                                            {evt.message}
                                        </div>
                                    </li>
                                ))}
                                {events.length === 0 && (
                                    <li className="text-sm text-gray-400 italic">최근 로그 없음</li>
                                )}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

