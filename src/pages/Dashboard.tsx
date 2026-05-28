import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertTriangle, Shield, Clock, CheckCircle2, TrendingUp, Activity, LogOut, CalendarIcon, RefreshCw } from "lucide-react";
import { useIncidents } from "@/context/useIncidents";
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import ThreatMap from "@/components/dashboard/ThreatMap";
import IncidentChart from "@/components/dashboard/IncidentChart";
import SeverityDistribution from "@/components/dashboard/SeverityDistribution";
import ResponderLeaderboard from "@/components/dashboard/ResponderLeaderboard";
import KpiBar from "@/components/dashboard/KpiBar";
import TypeDistribution from "@/components/dashboard/TypeDistribution";
import StatusDistribution from "@/components/dashboard/StatusDistribution";
import CountryTable from "@/components/dashboard/CountryTable";
import RecentIncidents from "@/components/dashboard/RecentIncidents";
import AlertsBar from "@/components/dashboard/AlertsBar";
import { useAuth } from "@/context/auth";
import type { DateRange } from "react-day-picker";

const INTERVAL_OPTIONS = [
  { value: "900000", label: "15 min" },
  { value: "43200000", label: "12 hrs" },
  { value: "86400000", label: "24 hrs" },
  { value: "0", label: "Off" },
];

const Dashboard = () => {
  const { incidents, loading, isLiveData, lastSyncTime, refreshData, autoRefreshInterval, setAutoRefreshInterval } = useIncidents();

  // Date range filter
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [datePreset, setDatePreset] = useState<string>("all");

  const handlePreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    switch (preset) {
      case "7d":
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case "30d":
        setDateRange({ from: subDays(now, 30), to: now });
        break;
      case "90d":
        setDateRange({ from: subDays(now, 90), to: now });
        break;
      default:
        setDateRange(undefined);
    }
  };

  const filteredIncidents = useMemo(() => {
    if (!dateRange?.from) return incidents;
    return incidents.filter(i => {
      const d = new Date(i.createdAt);
      return isWithinInterval(d, {
        start: startOfDay(dateRange.from!),
        end: endOfDay(dateRange.to || dateRange.from!),
      });
    });
  }, [incidents, dateRange]);

  // Show empty state if no live data
  if (!loading && !isLiveData && incidents.length === 0) {
    return (
      <div className="p-8 space-y-6 animate-fade-in">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <Activity className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">No Live Data Available</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Unable to connect to the backend. Please check your connection and try refreshing.
          </p>
          <button
            onClick={refreshData}
            disabled={loading}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Retrying..." : "Retry Connection"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Security Operations Dashboard</h1>
            <p className="text-muted-foreground">
              {isLiveData ? "Live data from API" : "No live data available"}
              {loading && " (loading...)"}
              {lastSyncTime && ` \u2022 Last sync: ${lastSyncTime.toLocaleTimeString()}`}
              {dateRange?.from && (
                <span className="ml-2 text-primary">
                  \u2022 Filtered: {format(dateRange.from, "MMM d")}
                  {dateRange.to ? ` - ${format(dateRange.to, "MMM d, yyyy")}` : ""}
                  {" "}({filteredIncidents.length} incidents)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Date range presets */}
            <div className="flex items-center gap-1 bg-card border border-border rounded-md p-0.5">
              {["all", "7d", "30d", "90d"].map(p => (
                <button
                  key={p}
                  onClick={() => handlePreset(p)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    datePreset === p
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {p === "all" ? "All" : p}
                </button>
              ))}
            </div>

            {/* Date range picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Custom
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    setDatePreset("custom");
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Auto-refresh */}
            <Select
              value={String(autoRefreshInterval)}
              onValueChange={(v) => setAutoRefreshInterval(Number(v))}
            >
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <RefreshCw className={`h-3 w-3 mr-1 ${autoRefreshInterval > 0 ? "animate-spin" : ""}`} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Live indicator + refresh */}
            <div className="flex items-center gap-2">
              {isLiveData && (
                <div className="flex items-center gap-1.5 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium">Live</span>
                </div>
              )}
              <button
                onClick={refreshData}
                disabled={loading}
                className="px-3 py-1 text-sm bg-primary/10 hover:bg-primary/20 rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <UserActions />
          </div>
        </div>
      </div>

      {/* Alerts + KPI */}
      <div className="space-y-4">
        <AlertsBar />
        <KpiBar />
      </div>

      {/* Row 1: Incident Trends + Severity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IncidentChart />
        <SeverityDistribution />
      </div>

      {/* Row 2: Status + Incident Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatusDistribution />
        <TypeDistribution />
      </div>

      {/* Row 2: Map + Side Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:auto-rows-fr">
        <div className="lg:col-span-2">
          <ThreatMap />
        </div>
        <div className="lg:h-full min-h-0">
          <ResponderLeaderboard />
        </div>
      </div>

      {/* Row 3: Recent Incidents + Country */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentIncidents />
        </div>
        <CountryTable />
      </div>
    </div>
  );
};

export default Dashboard;

const UserActions = () => {
  const { user, logout } = useAuth();
  return (
    <div className="flex items-center gap-3">
      <div className="text-sm text-muted-foreground">{user?.username}</div>
      <button
        onClick={logout}
        className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-md border border-border hover:bg-secondary"
        title="Logout"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </div>
  );
};
