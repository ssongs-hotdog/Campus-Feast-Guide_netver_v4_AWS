import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw, Zap, ChevronUp, ChevronDown } from 'lucide-react';
import { useTimeContext } from '@/lib/timeContext';
import { formatTime } from '@shared/types';

export function BottomTimePanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    timeState,
    togglePlay,
    toggleDemoSpeed,
    goToRealtime,
    setDisplayTime,
    availableTimestamps,
  } = useTimeContext();

  const sliderValue = (() => {
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
  })();

  const handleSliderChange = (value: number[]) => {
    if (availableTimestamps.length > 0 && value[0] < availableTimestamps.length) {
      setDisplayTime(new Date(availableTimestamps[value[0]]));
    }
  };

  const displayTimeLabel = formatTime(timeState.displayTime);

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg rounded-t-xl pb-safe"
      data-testid="bottom-time-panel"
    >
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="button-expand-time-panel"
      >
        <div className="flex items-center gap-3">
          <Badge 
            variant={timeState.mode === 'realtime' ? 'default' : 'secondary'}
            className="text-xs"
            data-testid="badge-time-mode-bottom"
          >
            {timeState.mode === 'realtime' ? '실시간' : '시뮬레이션'}
          </Badge>
          <span className="text-lg font-semibold text-foreground" data-testid="text-display-time-bottom">
            {displayTimeLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={timeState.isPlaying ? 'default' : 'outline'}
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            disabled={timeState.mode === 'realtime' || availableTimestamps.length === 0}
            data-testid="button-play-pause-bottom"
          >
            {timeState.isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">
          <div>
            <Slider
              value={sliderValue}
              onValueChange={handleSliderChange}
              max={Math.max(0, availableTimestamps.length - 1)}
              step={1}
              className="w-full"
              disabled={availableTimestamps.length === 0}
              data-testid="slider-time-bottom"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{availableTimestamps.length > 0 ? formatTime(new Date(availableTimestamps[0])) : '--:--'}</span>
              <span>{availableTimestamps.length > 0 ? formatTime(new Date(availableTimestamps[availableTimestamps.length - 1])) : '--:--'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            {timeState.mode === 'sim' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goToRealtime}
                className="text-xs gap-1"
                data-testid="button-go-realtime-bottom"
              >
                <RotateCcw className="w-3 h-3" />
                실시간으로
              </Button>
            )}
            
            <div className="flex items-center gap-2 ml-auto">
              <Zap className={`w-4 h-4 ${timeState.isDemoSpeed ? 'text-primary' : 'text-muted-foreground'}`} />
              <Label htmlFor="demo-speed-bottom" className="text-xs text-muted-foreground">
                시연 가속
              </Label>
              <Switch
                id="demo-speed-bottom"
                checked={timeState.isDemoSpeed}
                onCheckedChange={toggleDemoSpeed}
                disabled={timeState.mode === 'realtime'}
                data-testid="switch-demo-speed-bottom"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
