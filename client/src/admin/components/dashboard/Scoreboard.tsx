import { Card, CardContent } from "@/components/ui/card";
import { DashboardKPI, GoalGauge } from "@/admin/data/mockDashboardDataV2";
import { ArrowUp, ArrowDown, Target } from "lucide-react";

interface ScoreboardProps {
    kpis: DashboardKPI[];
    goals: GoalGauge[];
    isLoading: boolean;
}

export function Scoreboard({ kpis, goals, isLoading }: ScoreboardProps) {
    if (isLoading) {
        return <div className="h-32 bg-gray-100 animate-pulse rounded-lg" />;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
            {/* KPI Cards (Left 7-8 cols) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {kpis.map((kpi, idx) => (
                    <Card key={idx} className="border-l-4 border-l-transparent hover:border-l-[#0E4A84] transition-all shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-sm text-gray-500 font-medium">{kpi.label}</span>
                                <span className={`flex items-center text-xs px-1.5 py-0.5 rounded ${kpi.trend === 'up' ? 'bg-rose-50 text-rose-600' : kpi.trend === 'down' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                    {kpi.trend === 'up' ? <ArrowUp className="w-3 h-3 mr-0.5" /> : kpi.trend === 'down' ? <ArrowDown className="w-3 h-3 mr-0.5" /> : null}
                                    {kpi.trendValue}
                                </span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-gray-900">{kpi.value}</span>
                                <span className="text-sm text-gray-500">{kpi.unit}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 truncate">{kpi.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Goal Gauges (Right 4-5 cols) */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {goals.map((goal, idx) => {
                    const progress = Math.min((goal.current / goal.target) * 100, 100);
                    // For wait time (lower is better), if current > target, it's bad.
                    // For utilization (higher is better), if current > target, it's good.
                    // Simplified logic based on status prop from data for color.
                    const isSuccess = goal.status === 'success';
                    const barColor = isSuccess ? 'bg-emerald-500' : 'bg-rose-500';

                    return (
                        <Card key={idx} className="shadow-sm">
                            <CardContent className="p-4 flex flex-col justify-between h-full">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-1.5">
                                        <Target className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm font-medium text-gray-700">{goal.label}</span>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {isSuccess ? '달성' : '미달'}
                                    </span>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                                        <span>현재 <span className="font-semibold text-gray-900">{goal.current}{goal.unit}</span></span>
                                        <span>목표 {goal.target}{goal.unit}</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden relative">
                                        {/* Target Marker Line (If percent is roughly scale) */}
                                        <div
                                            className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10"
                                            style={{ left: `${Math.min((goal.target / (goal.current * 1.2)) * 100, 100)}%` }} // Rough positioning logic
                                        />
                                        {/* Actual Progress - simplified for demo: just fill based on ratio relative to aim or max? 
                                            Let's just use standard 0-100 scale for simplicity or relative to a reasonable max. 
                                            Visual approximation: if target is 15, current 18.5 => 100% full? 
                                            Let's simpler: progress bar represents % of "Goal Met" or "Capacity Used".
                                            For negative metrics (wait time), this is tricky visually.
                                            Let's use a specialized visualization: "Target vs Actual" bar.
                                        */}
                                        <div
                                            className={`h-full ${barColor} rounded-full transition-all duration-500`}
                                            style={{ width: '100%' }} // Just full bar, let the text do the work? No, let's make it relative.
                                        />
                                    </div>
                                    <div className="mt-2 text-xs text-right text-gray-400">
                                        {goal.status === 'fail' ? `목표보다 +${(goal.current - goal.target).toFixed(1)} ${goal.unit}` : '목표 달성'}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
