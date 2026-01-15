import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw, Zap } from 'lucide-react';
import { useTimeContext } from '@/lib/timeContext';
import { formatTime } from '@shared/types';

export function TimeControls() {
  const {
    timeState,
    togglePlay,
    toggleDemoSpeed,
    goToRealtime,
    setDisplayTime,
    availableTimestamps,
  } = useTimeContext();

  const sliderValue = useMemo(() => {
    if (availableTimestamps.length === 0) return [0];
    const currentTime = timeState.displayTime.getTime();
    let closestIdx = 0;
    let minDiff = Math.abs(new Date(availableTimestamps[0]).getTime() - currentTime);
    
    for (let i = 1; i < availableTimestamps.length; i++) {
      const diff = Math.abs(new Date(availableTimestamps[i]).getTime() - currentTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    return [closestIdx];
  }, [timeState.displayTime, availableTimestamps]);

  const handleSliderChange = (value: number[]) => {
    if (availableTimestamps.length > 0 && value[0] < availableTimestamps.length) {
      setDisplayTime(new Date(availableTimestamps[value[0]]));
    }
  };

  const displayTimeLabel = useMemo(() => {
    return formatTime(timeState.displayTime);
  }, [timeState.displayTime]);

  return (
    <div className="bg-card border border-card-border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge 
            variant={timeState.mode === 'realtime' ? 'default' : 'secondary'}
            className="text-xs"
            data-testid="badge-time-mode"
          >
            {timeState.mode === 'realtime' ? '실시간' : '시뮬레이션'}
          </Badge>
          <span className="text-lg font-semibold text-foreground" data-testid="text-display-time">
            {displayTimeLabel}
          </span>
        </div>
        {timeState.mode === 'sim' && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToRealtime}
            className="h-7 text-xs gap-1"
            data-testid="button-go-realtime"
          >
            <RotateCcw className="w-3 h-3" />
            실시간으로
          </Button>
        )}
      </div>

      <div className="mb-4">
        <Slider
          value={sliderValue}
          onValueChange={handleSliderChange}
          max={Math.max(0, availableTimestamps.length - 1)}
          step={1}
          className="w-full"
          disabled={availableTimestamps.length === 0}
          data-testid="slider-time"
        />
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant={timeState.isPlaying ? 'default' : 'outline'}
            size="icon"
            onClick={togglePlay}
            disabled={timeState.mode === 'realtime' || availableTimestamps.length === 0}
            data-testid="button-play-pause"
          >
            {timeState.isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${timeState.isDemoSpeed ? 'text-primary' : 'text-muted-foreground'}`} />
          <Label htmlFor="demo-speed" className="text-xs text-muted-foreground">
            시연 가속
          </Label>
          <Switch
            id="demo-speed"
            checked={timeState.isDemoSpeed}
            onCheckedChange={toggleDemoSpeed}
            disabled={timeState.mode === 'realtime'}
            data-testid="switch-demo-speed"
          />
        </div>
      </div>
    </div>
  );
}
