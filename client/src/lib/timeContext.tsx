import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { TimeMode, TimeState } from '@shared/types';

const AVAILABLE_DATES = ['2026-01-14', '2026-01-15', '2026-01-16'];
const TODAY_DATE = '2026-01-15';

interface TimeContextValue {
  timeState: TimeState;
  setMode: (mode: TimeMode) => void;
  setDisplayTime: (time: Date) => void;
  togglePlay: () => void;
  toggleDemoSpeed: () => void;
  goToRealtime: () => void;
  availableTimestamps: string[];
  setAvailableTimestamps: (ts: string[]) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedTime5Min: string;
  setSelectedTime5Min: (time: string) => void;
  isToday: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  goPrevDate: () => void;
  goNextDate: () => void;
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
  const [selectedDate, setSelectedDateState] = useState<string>(TODAY_DATE);
  const [selectedTime5Min, setSelectedTime5Min] = useState<string>('11:00');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isToday = selectedDate === TODAY_DATE;
  const dateIndex = AVAILABLE_DATES.indexOf(selectedDate);
  const canGoPrev = dateIndex > 0;
  const canGoNext = dateIndex < AVAILABLE_DATES.length - 1;

  const setSelectedDate = useCallback((date: string) => {
    setSelectedDateState(date);
    if (date !== TODAY_DATE) {
      setTimeState(prev => ({ ...prev, isPlaying: false }));
      setSelectedTime5Min('11:00');
    }
  }, []);

  const goPrevDate = useCallback(() => {
    const idx = AVAILABLE_DATES.indexOf(selectedDate);
    if (idx > 0) {
      setSelectedDate(AVAILABLE_DATES[idx - 1]);
    }
  }, [selectedDate, setSelectedDate]);

  const goNextDate = useCallback(() => {
    const idx = AVAILABLE_DATES.indexOf(selectedDate);
    if (idx < AVAILABLE_DATES.length - 1) {
      setSelectedDate(AVAILABLE_DATES[idx + 1]);
    }
  }, [selectedDate, setSelectedDate]);

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
    setSelectedDateState(TODAY_DATE);
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
        selectedDate,
        setSelectedDate,
        selectedTime5Min,
        setSelectedTime5Min,
        isToday,
        canGoPrev,
        canGoNext,
        goPrevDate,
        goNextDate,
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
