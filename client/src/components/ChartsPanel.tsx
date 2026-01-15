import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BarChart3, ChevronDown, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { RESTAURANTS, type WaitingData } from '@shared/types';

interface ChartsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const CORNER_NAMES: Record<string, string> = {
  western: '양식',
  korean: '한식',
  instant: '즉석',
  ramen: '라면',
  set_meal: '정식',
  single_dish: '일품',
  dam_a: 'Dam-A',
  pangeos: 'Pangeos',
};

export function ChartsPanel({ isOpen, onClose }: ChartsPanelProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState('hanyang_plaza');
  const [selectedCorner, setSelectedCorner] = useState('ramen');

  const { data: allData } = useQuery<WaitingData[]>({
    queryKey: ['/api/waiting/all'],
    queryFn: async () => {
      const res = await fetch('/api/waiting/all');
      if (!res.ok) throw new Error('Failed to fetch all waiting data');
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const selectedRestaurantInfo = RESTAURANTS.find(r => r.id === selectedRestaurant);
  const availableCorners = selectedRestaurantInfo?.cornerOrder || [];

  const chartData = useMemo(() => {
    if (!allData) return [];
    
    const filtered = allData.filter(
      d => d.restaurantId === selectedRestaurant && d.cornerId === selectedCorner
    );
    
    return filtered.map(d => {
      const date = new Date(d.timestamp);
      const timeLabel = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      return {
        time: timeLabel,
        timestamp: date.getTime(),
        waitTime: d.est_wait_time_min,
        queueLen: d.queue_len,
      };
    }).sort((a, b) => a.timestamp - b.timestamp);
  }, [allData, selectedRestaurant, selectedCorner]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="fixed bottom-0 left-0 right-0 z-[61] bg-background border-t border-border rounded-t-xl max-h-[85vh] overflow-auto pb-safe"
        onClick={e => e.stopPropagation()}
        data-testid="charts-panel"
      >
        <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">통계/그래프</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-charts"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 space-y-6">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs text-muted-foreground mb-1 block">식당</Label>
              <Select value={selectedRestaurant} onValueChange={(v) => {
                setSelectedRestaurant(v);
                const newRestaurant = RESTAURANTS.find(r => r.id === v);
                if (newRestaurant && newRestaurant.cornerOrder.length > 0) {
                  setSelectedCorner(newRestaurant.cornerOrder[0]);
                }
              }}>
                <SelectTrigger data-testid="select-restaurant">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESTAURANTS.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs text-muted-foreground mb-1 block">코너</Label>
              <Select value={selectedCorner} onValueChange={setSelectedCorner}>
                <SelectTrigger data-testid="select-corner">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCorners.map(c => (
                    <SelectItem key={c} value={c}>{CORNER_NAMES[c] || c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">예상 대기시간 (분)</h3>
            <div className="h-48 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                      tickFormatter={(v, i) => i % 30 === 0 ? v : ''}
                    />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="waitTime" 
                      stroke="#EF4444" 
                      strokeWidth={2}
                      dot={false}
                      name="대기시간"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  데이터를 불러오는 중...
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">대기열 길이 (명)</h3>
            <div className="h-48 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                      tickFormatter={(v, i) => i % 30 === 0 ? v : ''}
                    />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="queueLen" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={false}
                      name="대기열"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  데이터를 불러오는 중...
                </div>
              )}
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center pb-4">
            데이터 기간: 11:00 ~ 14:00 (1분 간격)
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChartsPanelTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="fixed bottom-20 right-4 z-40 shadow-md gap-1"
      data-testid="button-open-charts"
    >
      <BarChart3 className="w-4 h-4" />
      통계
    </Button>
  );
}
