import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bottleneck, DemandCapacity } from "@/admin/data/mockDashboardDataV2";
import { AlertCircle, Zap, Users, CheckCircle2 } from "lucide-react";

interface BottleneckSpotlightProps {
    bottlenecks: Bottleneck[];
    demandCapacity: DemandCapacity;
    isLoading: boolean;
}

export function BottleneckSpotlight({ bottlenecks, demandCapacity, isLoading }: BottleneckSpotlightProps) {
    if (isLoading) {
        return <div className="h-48 bg-gray-100 animate-pulse rounded-lg mb-6" />;
    }

    const hasBottlenecks = bottlenecks.length > 0;

    return (
        <section className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 ${hasBottlenecks ? 'text-rose-500' : 'text-emerald-500'}`} />
                병목 집중 분석 (Bottleneck Spotlight)
                {hasBottlenecks ? (
                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        지금 1순위 문제
                    </span>
                ) : (
                    <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        현재 운영 원활
                    </span>
                )}
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Bottleneck Cards (Take 3 columns) */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {hasBottlenecks ? (
                        bottlenecks.map((item) => (
                            <Card key={item.id} className="border-l-4 border-l-rose-500 shadow-sm hover:shadow-md transition-shadow">
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-base font-bold text-gray-900 truncate pr-2">{item.name}</CardTitle>
                                            <p className="text-xs text-gray-500 mb-2 truncate">{item.location}</p>
                                        </div>
                                        <span className="bg-rose-50 text-rose-700 text-xs px-2 py-1 rounded-md font-semibold border border-rose-100 shrink-0">
                                            {item.currentWait}분
                                        </span>
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                                            {item.causeLabel}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-2">
                                    {/* Simple Sparkline Visualization */}
                                    <div className="h-8 flex items-end gap-1 mb-3 opacity-70">
                                        {item.history.map((val, idx) => (
                                            <div
                                                key={idx}
                                                className="flex-1 bg-rose-200 rounded-t-sm"
                                                style={{ height: `${Math.min((val / 30) * 100, 100)}%` }} // Simplified scaling
                                            />
                                        ))}
                                    </div>

                                    <div className="bg-gray-50 p-2 rounded text-xs text-gray-700 mb-3 border border-gray-100">
                                        <span className="font-semibold text-rose-600 mr-1">Action:</span>
                                        {item.recommendedAction}
                                    </div>

                                    <Button size="sm" variant="outline" className="w-full text-xs h-7 text-gray-600">
                                        조치 완료 처리
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        // All Clear State
                        <div className="col-span-3 h-full min-h-[200px] flex flex-col items-center justify-center bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center">
                            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-800 mb-1">현재 큰 병목이 감지되지 않았습니다.</h4>
                            <p className="text-sm text-gray-500 mb-4">대기 시간 및 데이터 신뢰도가 모두 정상 범위 내입니다.</p>

                            <div className="flex gap-4">
                                <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                    <div className="text-xs text-gray-500">Peak 평균 대기</div>
                                    <div className="font-bold text-gray-700">관리 목표 달성 중</div>
                                </div>
                                <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                    <div className="text-xs text-gray-500">데이터 신뢰도</div>
                                    <div className="font-bold text-gray-700">안정적 (95%+)</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Demand vs Capacity Panel (Right 1 column) */}
                <Card className="shadow-sm border-gray-200 bg-slate-50/50">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Demand vs Capacity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <div className="mb-4">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500">유입 (Arrival)</span>
                                <span className="font-mono font-bold">{demandCapacity.arrivalRate}명</span>
                            </div>
                            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-full transition-all duration-500" style={{ width: '85%' }}></div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500">처리 (Capacity)</span>
                                <span className="font-mono font-bold">{demandCapacity.capacity}명</span>
                            </div>
                            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-full transition-all duration-500" style={{ width: '60%' }}></div>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-200">
                            <div className="text-center">
                                <div className="text-xs text-gray-500 mb-1">Gap Analysis</div>
                                <div className={`text-2xl font-bold flex justify-center items-center gap-1 ${demandCapacity.gap > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                    <Zap className="w-4 h-4 fill-current" />
                                    {demandCapacity.gap > 0 ? `+${demandCapacity.gap}` : demandCapacity.gap}명
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">
                                    {demandCapacity.gap > 0 ? "처리 용량 초과 중 (10분 당)" : "여유 용량 확보 중"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}
