/**
 * App.tsx - Application Root Component
 * 
 * Purpose: Sets up routing, providers, and global state for the HY-eat app.
 * 
 * Routing structure:
 * - /d/YYYY-MM-DD : Main view for a specific date
 * - /d/YYYY-MM-DD/restaurant/:restaurantId/corner/:cornerId : Menu detail for a date
 * - /ticket : Ticket management page
 * - / : Redirects to today's date
 */
import { Switch, Route, Redirect } from "wouter";
import { queryClient, persister } from "./lib/queryClient";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TimeProvider } from "@/lib/timeContext";
import { TicketProvider } from "@/lib/ticketContext";
import { FavoritesProvider } from "@/lib/favoritesContext";
import { SplashProvider } from "@/contexts/SplashContext";
import { SplashScreen } from "@/components/SplashScreen";
import Home from "@/pages/Home";
import HomeCornerDetail from "@/pages/HomeCornerDetail";
import MenuCornerDetail from "@/pages/MenuCornerDetail";
import NotFound from "@/pages/not-found";
import { getTodayKey } from "@/lib/dateUtils";
import BottomNav from "@/components/BottomNav";
import MenuPage from "@/pages/MenuPage";
import RecommendPage from "@/pages/RecommendPage";
import TabTicket from "@/pages/TabTicket";
import MyPage from "@/pages/MyPage";

import TopAppBar from "@/components/TopAppBar";
import NotificationCenter from "@/pages/NotificationCenter";

function RedirectToToday() {
  const todayKey = getTodayKey();
  return <Redirect to={`/d/${todayKey}`} />;
}

function Router() {
  return (
    <Switch>
      {/* Home Tab Routes */}
      <Route path="/" component={RedirectToToday} />
      <Route path="/d/:dayKey" component={Home} />
      <Route path="/d/:dayKey/restaurant/:restaurantId/corner/:cornerId" component={HomeCornerDetail} />
      <Route path="/restaurant/:restaurantId/corner/:cornerId" component={HomeCornerDetail} />

      {/* Menu Tab Routes */}
      <Route path="/menu" component={MenuPage} />
      <Route path="/menu/detail/:restaurantId/:cornerId" component={MenuCornerDetail} />

      {/* Other Tab Routes */}
      <Route path="/recommend" component={RecommendPage} />
      <Route path="/ticket" component={TabTicket} />
      <Route path="/my" component={MyPage} />

      {/* Feature Routes */}
      <Route path="/notifications" component={NotificationCenter} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <SplashProvider>
        <SplashScreen />
        <TooltipProvider>
          <TimeProvider>
            <TicketProvider>
              <FavoritesProvider>
                <Toaster />
                <TopAppBar />
                <div className="pt-[56px] pb-[60px] min-h-screen bg-background">
                  <Router />
                </div>
                <BottomNav />
              </FavoritesProvider>
            </TicketProvider>
          </TimeProvider>
        </TooltipProvider>
      </SplashProvider>
    </PersistQueryClientProvider>
  );
}

export default App;
