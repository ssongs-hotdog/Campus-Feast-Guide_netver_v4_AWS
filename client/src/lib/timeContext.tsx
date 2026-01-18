/**
 * timeContext.tsx - Time State Management
 * 
 * Purpose: Manages time-related state for the HY-eat app including:
 * - Current display time (realtime or simulated)
 * - Available timestamps for data navigation
 * - Time selection for historical data viewing
 * 
 * Note: Date navigation has been moved to URL-based routing.
 * The selectedDate is now passed in from the URL, not managed here.
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { TimeMode, TimeState } from '@shared/types';
import { getTodayKey, type DayKey } from './dateUtils';

interface TimeContextValue {
  timeState: TimeState;
  setMode: (mode: TimeMode) => void;
  setDisplayTime: (time: Date) => void;
  togglePlay: () => void;
  toggleDemoSpeed: () => void;
  goToRealtime: () => void;
  availableTimestamps: string[];
  setAvailableTimestamps: (ts: string[]) => void;
  selectedTime5Min: string;
  setSelectedTime5Min: (time: string) => void;
  todayKey: DayKey;
}

const TimeContext = createContext<TimeContextValue | null>(null);

function getKSTNow(): Date {
  return new Date();
}

export function TimeProvider({ children }: { children: React.ReactNode }) {
  const [timeState, setTimeState] = useState<TimeState>({
    mode: 'realtime',
    displayTime: getKSTNow(),
    isPlaying: false,
    isDemoSpeed: false,
  });

  const [availableTimestamps, setAvailableTimestamps] = useState<string[]>([]);
  const [selectedTime5Min, setSelectedTime5Min] = useState<string>('11:00');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const todayKey = getTodayKey();

  const setMode = useCallback((mode: TimeMode) => {
    setTimeState((prev) => ({ ...prev, mode }));
  }, []);

  const setDisplayTime = useCallback((time: Date) => {
    setTimeState((prev) => ({
      ...prev,
      displayTime: time,
      mode: 'sim',
    }));
  }, []);

  const togglePlay = useCallback(() => {
    setTimeState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const toggleDemoSpeed = useCallback(() => {
    setTimeState((prev) => ({ ...prev, isDemoSpeed: !prev.isDemoSpeed }));
  }, []);

  const goToRealtime = useCallback(() => {
    setTimeState({
      mode: 'realtime',
      displayTime: getKSTNow(),
      isPlaying: false,
      isDemoSpeed: false,
    });
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (timeState.mode === 'realtime') {
      intervalRef.current = setInterval(() => {
        setTimeState((prev) => ({
          ...prev,
          displayTime: getKSTNow(),
        }));
      }, 60000);
    } else if (timeState.isPlaying && availableTimestamps.length > 0) {
      const interval = timeState.isDemoSpeed ? 2000 : 60000;
      
      const currentIdx = findClosestTimestampIndex(timeState.displayTime, availableTimestamps);
      if (currentIdx >= availableTimestamps.length - 1) {
        setTimeState((prev) => ({ ...prev, isPlaying: false }));
        return;
      }
      
      intervalRef.current = setInterval(() => {
        setTimeState((prev) => {
          const idx = findClosestTimestampIndex(prev.displayTime, availableTimestamps);
          const nextIdx = idx + 1;
          
          if (nextIdx >= availableTimestamps.length) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            return { ...prev, isPlaying: false };
          }
          
          return {
            ...prev,
            displayTime: new Date(availableTimestamps[nextIdx]),
          };
        });
      }, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timeState.mode, timeState.isPlaying, timeState.isDemoSpeed, availableTimestamps, timeState.displayTime]);

  return (
    <TimeContext.Provider
      value={{
        timeState,
        setMode,
        setDisplayTime,
        togglePlay,
        toggleDemoSpeed,
        goToRealtime,
        availableTimestamps,
        setAvailableTimestamps,
        selectedTime5Min,
        setSelectedTime5Min,
        todayKey,
      }}
    >
      {children}
    </TimeContext.Provider>
  );
}

export function useTimeContext() {
  const context = useContext(TimeContext);
  if (!context) {
    throw new Error('useTimeContext must be used within TimeProvider');
  }
  return context;
}

function findClosestTimestampIndex(target: Date, timestamps: string[]): number {
  if (timestamps.length === 0) return 0;
  
  const targetTime = target.getTime();
  let closestIdx = 0;
  let minDiff = Math.abs(new Date(timestamps[0]).getTime() - targetTime);
  
  for (let i = 1; i < timestamps.length; i++) {
    const diff = Math.abs(new Date(timestamps[i]).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }
  
  return closestIdx;
}
