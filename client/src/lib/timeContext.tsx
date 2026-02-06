/**
 * timeContext.tsx - Time State Management
 * 
 * Purpose: Manages time-related state for the HY-eat app including:
 * - Current display time (realtime or simulated)
 * - Available timestamps for data navigation
 * - server-offset based time synchronization for robust accuracy
 * 
 * UPDATE (2026-02-06): Implemented Server Offset pattern.
 * Instead of relying on client clock + interval drift, we calculate
 * offset = serverTime - clientReponseTime
 * displayTime = Date.now() + offset
 * This ensures even if browser throttle intervals, time jumps to correct
 * server time immediately upon next tick.
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
  /** Selected time for non-today dates. null = no selection (all corners inactive) */
  selectedTime5Min: string | null;
  setSelectedTime5Min: (time: string | null) => void;
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
  // Default to null (no selection) for non-today dates - all corners show inactive
  const [selectedTime5Min, setSelectedTime5Min] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Server-authoritative todayKey (KST timezone)
  const [serverToday, setServerToday] = useState<string | null>(null);

  // Time Synchronization State
  const [serverOffset, setServerOffset] = useState<number>(0);
  // 0 means assume client time is correct until fetched

  // Fetch config and calculate offset
  const fetchConfigAndSync = useCallback(async () => {
    try {
      const requestStart = Date.now();
      const res = await fetch('/api/config');
      const requestEnd = Date.now();

      if (res.ok) {
        const data = await res.json();

        // 1. Sync Today Key
        if (data.today && typeof data.today === 'string') {
          setServerToday(data.today);
        }

        // 2. Sync Time Offset
        if (data.serverTime) {
          const serverTimeMs = new Date(data.serverTime).getTime();
          // Network delay assumption: request took (end - start) ms
          // We assume server handled it roughly in the middle: start + RTT/2
          const networkDelay = (requestEnd - requestStart) / 2;

          // Offset = (ServerTime) - (ClientTime at that moment)
          const offset = serverTimeMs - (requestEnd - networkDelay);

          setServerOffset(offset);
          // console.log(`[TimeSync] Validated. Offset: ${Math.round(offset)}ms`);
        }
      }
    } catch {
      console.warn('[TimeContext] Failed to fetch config, keeping previous offset');
    }
  }, []);

  // Initial sync and periodic re-sync (every 5 mins)
  useEffect(() => {
    fetchConfigAndSync();
    const interval = setInterval(fetchConfigAndSync, 300000); // 5 min
    return () => clearInterval(interval);
  }, [fetchConfigAndSync]);

  // Authoritative todayKey
  const todayKey = serverToday ?? getTodayKey();

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
    // When going to realtime, update immediately with current offset
    const nowWithOffset = new Date(Date.now() + serverOffset);
    setTimeState({
      mode: 'realtime',
      displayTime: nowWithOffset,
      isPlaying: false,
      isDemoSpeed: false,
    });
  }, [serverOffset]);

  // Main Time Loop
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (timeState.mode === 'realtime') {
      // Logic: Update displayTime every second (or minute) using offset
      // We update more frequently (e.g. 1s) for smoothness if seconds are shown, 
      // but here 10s is enough for minute-level UI.
      intervalRef.current = setInterval(() => {
        setTimeState((prev) => ({
          ...prev,
          displayTime: new Date(Date.now() + serverOffset),
        }));
      }, 5000); // Check every 5s to be responsive enough
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
  }, [timeState.mode, timeState.isPlaying, timeState.isDemoSpeed, availableTimestamps, timeState.displayTime, serverOffset]);

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
