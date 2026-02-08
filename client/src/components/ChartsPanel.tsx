import { BarChart as BarChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { RESTAURANTS } from "@shared/types";
import { getAllWaitTimes } from "@/lib/data/dataProvider";

interface ChartsPanelTriggerProps {
  onClick: () => void;
}

export function ChartsPanelTrigger({ onClick }: ChartsPanelTriggerProps) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-20 right-4 rounded-full w-12 h-12 shadow-lg z-40"
      size="icon"
      data-testid="button-charts-trigger"
    >
      <BarChartIcon className="w-6 h-6" />
    </Button>
  );
}

interface ChartsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
}

export function ChartsPanel({ isOpen, onClose, selectedDate }: ChartsPanelProps) {
  // Fetch all waiting data for the day
  // Note: We need an endpoint for ALL data to render charts effectively.
  // Assuming /api/waiting/all?date=... exists and returns array of all snapshots
  const { data: dayData } = useQuery({
    queryKey: ['/api/waiting/all', selectedDate],
    queryFn: async () => {
      return await getAllWaitTimes(selectedDate);
    },
    enabled: isOpen && !!selectedDate,
  });

  const getCornerData = (restaurantId: string, cornerId: string) => {
    if (!dayData || dayData.length === 0) return [];
    return dayData
      .filter((d: any) => d.restaurantId === restaurantId && d.cornerId === cornerId)
      .sort((a: any, b: any) => a.timestamp.localeCompare(b.timestamp))
      .map((d: any) => ({
        time: d.timestamp.split('T')[1].substring(0, 5),
        queueLen: d.queueLen,
        waitTime: d.estWaitTimeMin,
      }));
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-xl px-0">
        <SheetHeader className="px-6 mb-4">
          <SheetTitle>시간대별 대기 현황</SheetTitle>
          <SheetDescription>
            오늘의 식당별/코너별 예상 대기시간 추이입니다.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-full px-6 pb-12">
          <div className="space-y-6 pb-12">
            {RESTAURANTS.map(restaurant => (
              <div key={restaurant.id} className="space-y-4">
                <h3 className="font-bold text-lg">{restaurant.name}</h3>
                <div className="grid gap-4">
                  {restaurant.cornerOrder.map(cornerId => {
                    const data = getCornerData(restaurant.id, cornerId);
                    if (data.length === 0) return null;

                    return (
                      <Card key={cornerId}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">
                            {cornerId} {/* Should use display name mapping */}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[150px] pl-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id={`grad-${restaurant.id}-${cornerId}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis
                                dataKey="time"
                                tickLine={false}
                                axisLine={false}
                                fontSize={10}
                                tickMargin={5}
                                interval="preserveStartEnd"
                                minTickGap={20}
                              />
                              <YAxis
                                hide
                                domain={[0, 'auto']}
                              />
                              <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [`${value}분`, '대기시간']}
                              />
                              <Area
                                type="monotone"
                                dataKey="waitTime"
                                stroke="#3b82f6"
                                fillOpacity={1}
                                fill={`url(#grad-${restaurant.id}-${cornerId})`}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
