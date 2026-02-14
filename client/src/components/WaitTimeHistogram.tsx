/**
 * WaitTimeHistogram.tsx - Hourly Wait Time Chart Component
 * 
 * Displays a histogram showing wait times throughout operating hours.
 * Features:
 * - Filters data by operating hours
 * - Color-coded bars (green/yellow/red)
 * - Interactive tooltips
 * - Responsive design
 */
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface WaitTimeHistogramProps {
    operatingHours: { openTime: string; closeTime: string };
    forecastData: Array<{ time: string; waitMinutes: number }>;
    currentTime?: string;
}

// Helper: Convert HH:MM to minutes since midnight
function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

// Helper: Get bar color based on wait time
function getBarColor(waitMinutes: number): string {
    if (waitMinutes < 5) return '#10B981'; // Green
    if (waitMinutes < 15) return '#F59E0B'; // Yellow/Orange
    return '#EF4444'; // Red
}

export function WaitTimeHistogram({ operatingHours, forecastData, currentTime }: WaitTimeHistogramProps) {
    // Filter data to only show operating hours
    const filteredData = useMemo(() => {
        const openMinutes = timeToMinutes(operatingHours.openTime);
        const closeMinutes = timeToMinutes(operatingHours.closeTime);

        return forecastData.filter(item => {
            const itemMinutes = timeToMinutes(item.time);
            return itemMinutes >= openMinutes && itemMinutes <= closeMinutes;
        });
    }, [forecastData, operatingHours]);

    // Empty state when no data
    if (filteredData.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">현재 대기 시간 데이터가 없습니다</p>
            </div>
        );
    }

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                    <p className="text-sm font-semibold">{data.time}</p>
                    <p className="text-sm text-muted-foreground">
                        예상 대기: <span className="font-medium text-foreground">{data.waitMinutes}분</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full">
            <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">시간대별 예상 대기시간</h3>
                <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-[#10B981]" />
                        <span className="text-muted-foreground">&lt;5분</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-[#F59E0B]" />
                        <span className="text-muted-foreground">5-15분</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-[#EF4444]" />
                        <span className="text-muted-foreground">&gt;15분</span>
                    </div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                        dataKey="time"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#E5E7EB' }}
                        label={{ value: '분', angle: 0, position: 'top', offset: 10, fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                    <Bar dataKey="waitMinutes" radius={[4, 4, 0, 0]}>
                        {filteredData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(entry.waitMinutes)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
