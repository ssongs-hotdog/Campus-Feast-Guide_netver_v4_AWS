import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MonitoringCornerStatus } from "@/admin/data/mockMonitoringData";
import { Clock, TrendingUp, AlertCircle } from "lucide-react";

interface MonitoringDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    corner: MonitoringCornerStatus | null;
}

export function MonitoringDrawer({ isOpen, onClose, corner }: MonitoringDrawerProps) {
    if (!corner) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <Badge variant="outline" className="mb-2 text-gray-500 border-gray-300">
                                {corner.restaurantName}
                            </Badge>
                            <SheetTitle className="text-2xl font-bold text-gray-900">
                                {corner.cornerName}
                            </SheetTitle>
                            <SheetDescription className="mt-1 flex items-center gap-2">
                                ID: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{corner.id}</code>
                            </SheetDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {/* Status Badge Reuse Logic - keeping it simple text here or styling */}
                            <span className={`px-3 py-1 rounded-full text-sm font-bold border ${corner.status === 'congested' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                                    'bg-emerald-50 border-emerald-200 text-emerald-700'
                                }`}>
                                {corner.status === 'congested' ? '혼잡' : corner.status === 'normal' ? '원활' : corner.status}
                            </span>
                        </div>
                    </div>
                </SheetHeader>

                <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-2 text-slate-500 mb-2 text-sm font-medium">
                                <Clock className="w-4 h-4" /> 예상 대기 시간
                            </div>
                            <div className="text-3xl font-bold font-mono text-slate-900">
                                {corner.estWaitTimeMin}<span className="text-lg font-normal text-slate-500 ml-1">분</span>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-2 text-slate-500 mb-2 text-sm font-medium">
                                <TrendingUp className="w-4 h-4" /> 신뢰도
                            </div>
                            <div className="text-3xl font-bold font-mono text-slate-900">
                                {corner.reliabilityPct}<span className="text-lg font-normal text-slate-500 ml-1">%</span>
                            </div>
                        </div>
                    </div>

                    {/* Operating Info */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <h4 className="font-bold text-gray-800 mb-3 text-sm">운영 정보</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">운영 시간</span>
                                <span className="font-medium text-gray-900">{corner.operatingHours}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">마지막 업데이트</span>
                                <span className="font-medium text-gray-900">
                                    {new Date(corner.lastUpdatedAt).toLocaleTimeString()}
                                    <span className="text-gray-400 text-xs ml-1">({corner.updateDelayMin}분 전)</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Sparkline / Trend */}
                    <div>
                        <h4 className="font-bold text-gray-800 mb-3 text-sm">최근 30분 대기 추이</h4>
                        <div className="h-40 bg-gray-50 rounded-lg border border-gray-100 flex items-end justify-between p-4 gap-1">
                            {corner.recentTrendPoints.map((val, idx) => (
                                <div
                                    key={idx}
                                    className="flex-1 bg-blue-400/80 rounded-t-sm transition-all hover:bg-blue-600"
                                    style={{ height: `${Math.min(100, (val / 40) * 100)}%` }}
                                    title={`${val}분`}
                                ></div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-gray-100">
                        <h4 className="font-bold text-gray-800 mb-3 text-sm">빠른 조치 (Coming Soon)</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" disabled className="h-10 justify-start">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                혼잡 상태 강제 설정
                            </Button>
                            <Button variant="outline" disabled className="h-10 justify-start">
                                품절 처리
                            </Button>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
