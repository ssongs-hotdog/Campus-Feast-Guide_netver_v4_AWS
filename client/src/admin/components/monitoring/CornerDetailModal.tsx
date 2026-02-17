import { useState, useMemo } from "react";
import {
    MOCK_MONITORING_DATA,
    getMonitoringHistory,
    getMonitoringEvents
} from "../../data/mockMonitoringData";
import { RESTAURANTS, CORNERS } from "../../data/mock_canonical";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, History, AlertCircle, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CornerDetailModalProps {
    cornerId: string | null;
    onClose: () => void;
}

export function CornerDetailModal({ cornerId, onClose }: CornerDetailModalProps) {
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("");
    const [selectedCornerId, setSelectedCornerId] = useState<string>(cornerId || "");

    // Update internal state when cornerId prop changes
    useMemo(() => {
        if (cornerId) {
            setSelectedCornerId(cornerId);
            const corner = CORNERS.find(c => c.id === cornerId);
            if (corner) {
                setSelectedRestaurantId(corner.restaurantId);
            }
        }
    }, [cornerId]);

    const currentCorner = MOCK_MONITORING_DATA.find(c => c.id === selectedCornerId);

    // Filtered corners based on restaurant selection
    const filteredCorners = useMemo(() => {
        if (!selectedRestaurantId) return CORNERS;
        return CORNERS.filter(c => c.restaurantId === selectedRestaurantId);
    }, [selectedRestaurantId]);

    // Chart data
    const trendData = useMemo(() => {
        if (!selectedCornerId) return [];
        return getMonitoringHistory(selectedCornerId);
    }, [selectedCornerId]);

    const events = useMemo(() => {
        if (!selectedCornerId) return [];
        return getMonitoringEvents(selectedCornerId);
    }, [selectedCornerId]);

    const handleRestaurantChange = (val: string) => {
        setSelectedRestaurantId(val);
        // Auto-select first corner of new restaurant
        const firstCorner = CORNERS.find(c => c.restaurantId === val);
        if (firstCorner) {
            setSelectedCornerId(firstCorner.id);
        }
    };

    const handleCornerChange = (val: string) => {
        setSelectedCornerId(val);
        const corner = CORNERS.find(c => c.id === val);
        if (corner) {
            setSelectedRestaurantId(corner.restaurantId);
        }
    };

    if (!currentCorner) {
        return null;
    }

    return (
        <Dialog open={!!cornerId} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
                {/* Header */}
                <DialogHeader className="sticky top-0 bg-white z-10 border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold">코너 상세 정보</DialogTitle>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-xs text-gray-400">마지막 업데이트</div>
                                <div className="text-sm text-gray-600">
                                    {new Date(currentCorner.lastUpdatedAt).toLocaleTimeString()}
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Selectors */}
                    <div className="flex gap-3 mt-4">
                        <Select value={selectedRestaurantId} onValueChange={handleRestaurantChange}>
                            <SelectTrigger className="w-[200px] bg-white border-gray-300">
                                <SelectValue placeholder="식당 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                {RESTAURANTS.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedCornerId} onValueChange={handleCornerChange}>
                            <SelectTrigger className="w-[220px] bg-white border-gray-300">
                                <SelectValue placeholder="코너 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredCorners.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </DialogHeader>

                {/* Content */}
                <div className="px-6 pb-6 space-y-6">
                    {/* KPI Cards */}
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
                                <div className="text-2xl font-bold">
                                    {currentCorner.estWaitTimeMin} <span className="text-sm font-normal text-gray-500">분</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-gray-200 bg-white">
                            <CardContent className="p-4">
                                <div className="text-sm text-gray-500 mb-1">신뢰도</div>
                                <div className="text-2xl font-bold text-emerald-600">
                                    {currentCorner.reliabilityPct}%
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-gray-200 bg-white">
                            <CardContent className="p-4">
                                <div className="text-sm text-gray-500 mb-1">업데이트 지연</div>
                                <div className={cn("text-2xl font-bold", currentCorner.updateDelayMin > 10 ? "text-rose-600" : "text-gray-900")}>
                                    {currentCorner.updateDelayMin} <span className="text-sm font-normal text-gray-500">분</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts & Info */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Charts */}
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

                        {/* Info & Logs */}
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
            </DialogContent>
        </Dialog>
    );
}
