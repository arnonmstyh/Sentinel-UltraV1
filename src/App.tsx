import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { IncidentsProvider } from "@/context/useIncidents";
import { AuthProvider, useAuth } from "@/context/auth";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Incidents from "./pages/Incidents";
import IncidentDetail from "./pages/IncidentDetail";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import SSLMonitor from "./pages/SSLMonitor";
import ResponderLiveRace from "./pages/ResponderLiveRace";

const queryClient = new QueryClient();

const RequireAuth = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <IncidentsProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<RequireAuth><Layout><Outlet /></Layout></RequireAuth>}>
                <Route index element={<Dashboard />} />
                <Route path="incidents" element={<Incidents />} />
                <Route path="incidents/:id" element={<IncidentDetail />} />
                <Route path="reports" element={<Reports />} />
                <Route path="ssl-monitor" element={<SSLMonitor />} />
                <Route path="responders/live-race" element={<ResponderLiveRace />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </IncidentsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
