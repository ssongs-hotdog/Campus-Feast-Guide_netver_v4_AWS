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

        // Background prefetch function
        const startBackgroundPrefetch = () => {
            const datesToPrefetch: string[] = [];
            for (let i = -7; i <= 7; i++) {
                const date = addDays(todayKey, i);
                // Skip -2 to +2 range as it is handled by initial load
                if (Math.abs(i) <= 2) continue;
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

        // 1. Minimum display time (300ms)
        const minTimer = setTimeout(() => {
            minTimePassed = true;
            if (dataLoaded && isMounted) setIsVisible(false);
        }, 300);

        // 2. Maximum safe timeout (1.5s)
        const maxTimer = setTimeout(() => {
            if (isMounted) setIsVisible(false);
        }, 1500);

        // 3. Fetch initial data (Today +/- 2 days)
        const fetchInitialData = async () => {
            try {
                const datesToLoad = [
                    todayKey,
                    addDays(todayKey, 1),
                    addDays(todayKey, -1),
                    addDays(todayKey, 2),
                    addDays(todayKey, -2),
                ];

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
