import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Home from "@/pages/home";
import SavedSearchesPage from "@/pages/saved-searches";
import MeetingFlightsPage from "@/pages/meeting-flights";
import HotelsPage from "@/pages/hotels";
import TripPlannerPage from "@/pages/trip-planner";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/saved-searches" component={SavedSearchesPage} />
      <Route path="/meeting-flights" component={MeetingFlightsPage} />
      <Route path="/hotels" component={HotelsPage} />
      <Route path="/trip-planner" component={TripPlannerPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="flight-finder-theme">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <ProtectedRoute>
              <Router />
            </ProtectedRoute>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
