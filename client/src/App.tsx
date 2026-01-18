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
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TimeProvider } from "@/lib/timeContext";
import { TicketProvider } from "@/lib/ticketContext";
import Home from "@/pages/Home";
import CornerDetail from "@/pages/CornerDetail";
import TicketPage from "@/pages/TicketPage";
import NotFound from "@/pages/not-found";
import { getTodayKey } from "@/lib/dateUtils";

function RedirectToToday() {
  const todayKey = getTodayKey();
  return <Redirect to={`/d/${todayKey}`} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RedirectToToday} />
      <Route path="/d/:dayKey" component={Home} />
      <Route path="/d/:dayKey/restaurant/:restaurantId/corner/:cornerId" component={CornerDetail} />
      <Route path="/restaurant/:restaurantId/corner/:cornerId" component={CornerDetail} />
      <Route path="/ticket" component={TicketPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TimeProvider>
          <TicketProvider>
            <Toaster />
            <Router />
          </TicketProvider>
        </TimeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
