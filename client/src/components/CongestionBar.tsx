import { getCongestionLevel, CONGESTION_LABELS, CONGESTION_COLORS, type CongestionLevel } from '@shared/types';

interface CongestionBarProps {
  estWaitTime?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  noData?: boolean;
}

export function CongestionBar({ estWaitTime, showLabel = true, size = 'md', noData = false }: CongestionBarProps) {
  const barHeight = size === 'sm' ? 'h-2' : 'h-2.5';
  
  // If no data, show gray bars with "미제공" label
  if (noData || estWaitTime === undefined) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((barLevel) => (
            <div
              key={barLevel}
              className={`flex-1 ${barHeight} rounded-sm`}
              style={{
                backgroundColor: 'hsl(var(--muted))',
              }}
            />
          ))}
        </div>
        {showLabel && (
          <span className="text-xs font-medium text-right text-muted-foreground">
            미제공
          </span>
        )}
      </div>
    );
  }

  const level = getCongestionLevel(estWaitTime);
  
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((barLevel) => {
          const isActive = barLevel <= level;
          const color = isActive ? CONGESTION_COLORS[barLevel as CongestionLevel] : undefined;
          
          return (
            <div
              key={barLevel}
              className={`flex-1 ${barHeight} rounded-sm transition-colors duration-200`}
              style={{
                backgroundColor: color || 'hsl(var(--muted))',
              }}
            />
          );
        })}
      </div>
      {showLabel && (
        <span
          className="text-xs font-medium text-right"
          style={{ color: CONGESTION_COLORS[level] }}
        >
          {CONGESTION_LABELS[level]}
        </span>
      )}
    </div>
  );
}
