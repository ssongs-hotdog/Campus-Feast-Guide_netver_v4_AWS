import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getMenus } from "@/lib/data/dataProvider";
import { getTodayKey, addDays } from "@/lib/dateUtils";

interface SplashContextType {
    isVisible: boolean;
}

const SplashContext = createContext<SplashContextType | undefined>(undefined);

export function SplashProvider({ children }: { children: React.ReactNode }) {
    const [isVisible, setIsVisible] = useState(true);
    const queryClient = useQueryClient();
    const todayKey = getTodayKey();

    useEffect(() => {
        let minTimePassed = false;
        let dataLoaded = false;
        let isMounted = true;

        // Background prefetch function (Phase 2: Remaining days in +/- 7 range)
        const startBackgroundPrefetch = () => {
            const datesToPrefetch: string[] = [];
            const MAX_RANGE = 7;
            const ALREADY_LOADED_RANGE = 5;

            for (let i = -MAX_RANGE; i <= MAX_RANGE; i++) {
                // Skip days that were already loaded in the splash phase
                if (Math.abs(i) <= ALREADY_LOADED_RANGE) continue;

                const date = addDays(todayKey, i);
                datesToPrefetch.push(date);
            }

            datesToPrefetch.forEach((date) => {
                queryClient.prefetchQuery({
                    queryKey: ["/api/menu", date],
                    queryFn: async () => {
                        const res = await getMenus(date);
                        if (res.error) throw new Error(res.error);
                        return res.data;
                    },
                    staleTime: Infinity,
                });
            });
        };

        // 1. Minimum display time (1000ms = 1s)
        const minTimer = setTimeout(() => {
            minTimePassed = true;
            if (dataLoaded && isMounted) setIsVisible(false);
        }, 1000);

        // 2. Maximum safe timeout (2.5s) - Increased slightly to accommodate larger fetch
        const maxTimer = setTimeout(() => {
            if (isMounted) setIsVisible(false);
        }, 2500);

        // 3. Fetch initial data (Today +/- 5 days) -> Total 11 days
        const fetchInitialData = async () => {
            try {
                const datesToLoad: string[] = [];
                const SPLASH_LOAD_RANGE = 5;

                for (let i = -SPLASH_LOAD_RANGE; i <= SPLASH_LOAD_RANGE; i++) {
                    datesToLoad.push(addDays(todayKey, i));
                }

                await Promise.all(
                    datesToLoad.map((date) =>
                        queryClient.prefetchQuery({
                            queryKey: ["/api/menu", date],
                            queryFn: async () => {
                                const res = await getMenus(date);
                                if (res.error) throw new Error(res.error);
                                return res.data;
                            },
                            staleTime: Infinity,
                        })
                    )
                );
            } catch (e) {
                console.error("Splash prefetch failed:", e);
            } finally {
                dataLoaded = true;
                // Check if both conditions are met
                if (minTimePassed && isMounted) {
                    setIsVisible(false);
                }

                // Always start background prefetch after initial load
                startBackgroundPrefetch();
            }
        };

        fetchInitialData();

        return () => {
            isMounted = false;
            clearTimeout(minTimer);
            clearTimeout(maxTimer);
        };
    }, [queryClient, todayKey]);

    return (
        <SplashContext.Provider value={{ isVisible }}>
            {children}
        </SplashContext.Provider>
    );
}

export function useSplash() {
    const context = useContext(SplashContext);
    if (context === undefined) {
        throw new Error("useSplash must be used within a SplashProvider");
    }
    return context;
}
