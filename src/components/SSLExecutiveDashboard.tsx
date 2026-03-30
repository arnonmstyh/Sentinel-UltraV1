import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Star,
  TrendingUp,
  TrendingDown,
  Activity,
  Lock,
  AlertTriangle,
} from "lucide-react";

interface UrlData {
  id: number;
  url: string;
  issuer: string | null;
  validFrom: string | null;
  expiryDate: string | null;
  daysRemaining: number | null;
  status: "GOOD" | "WARNING" | "EXPIRED" | "ERROR" | "PENDING";
  serviceStatus?: "UP" | "DOWN" | "DEGRADED" | "UNKNOWN";
  responseTime?: number | null;
  httpStatusCode?: number | null;
  lastServiceCheck?: string | null;
  consecutiveFailures?: number;
  lastChecked: string;
  lastError?: string | null;
  starred?: boolean;
}

interface SSLExecutiveDashboardProps {
  urls: UrlData[];
}

// ─── Color palette ───
const COLORS = {
  good: "#34d399",
  goodDim: "rgba(52, 211, 153, 0.15)",
  warning: "#fbbf24",
  warningDim: "rgba(251, 191, 36, 0.15)",
  expired: "#f87171",
  expiredDim: "rgba(248, 113, 113, 0.15)",
  error: "#94a3b8",
  errorDim: "rgba(148, 163, 184, 0.12)",
  pending: "#60a5fa",
  pendingDim: "rgba(96, 165, 250, 0.12)",
  primary: "#22d3ee",
  primaryDim: "rgba(34, 211, 238, 0.12)",
  cardBg: "hsl(220, 20%, 10%)",
  cardBorder: "hsl(220, 17%, 18%)",
  gridLine: "hsl(220, 17%, 14%)",
  textMuted: "hsl(215, 20%, 55%)",
  textDim: "hsl(215, 20%, 40%)",
};

const STATUS_COLORS: Record<string, string> = {
  GOOD: COLORS.good,
  WARNING: COLORS.warning,
  EXPIRED: COLORS.expired,
  ERROR: COLORS.error,
  PENDING: COLORS.pending,
};

// ─── Tooltip style shared across charts ───
const tooltipStyle = {
  backgroundColor: "hsl(220, 20%, 12%)",
  border: "1px solid hsl(220, 17%, 20%)",
  borderRadius: "0.5rem",
  color: "hsl(210, 40%, 98%)",
  fontSize: 12,
  padding: "8px 12px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

// ─── Helpers ───
function extractHostname(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

function getHealthGrade(pct: number): { label: string; color: string } {
  if (pct >= 95) return { label: "A+", color: COLORS.good };
  if (pct >= 90) return { label: "A", color: COLORS.good };
  if (pct >= 80) return { label: "B", color: COLORS.primary };
  if (pct >= 70) return { label: "C", color: COLORS.warning };
  if (pct >= 50) return { label: "D", color: "#f97316" };
  return { label: "F", color: COLORS.expired };
}

// ═══════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════
const SSLExecutiveDashboard = ({ urls }: SSLExecutiveDashboardProps) => {
  // ─── Computed stats ───
  const stats = useMemo(() => {
    const total = urls.length;
    const good = urls.filter((u) => u.status === "GOOD").length;
    const warning = urls.filter((u) => u.status === "WARNING").length;
    const expired = urls.filter((u) => u.status === "EXPIRED").length;
    const error = urls.filter((u) => u.status === "ERROR").length;
    const pending = urls.filter((u) => u.status === "PENDING").length;
    const starred = urls.filter((u) => u.starred).length;
    const healthPct = total > 0 ? Math.round((good / total) * 100) : 0;
    const avgDays =
      urls.filter((u) => u.daysRemaining !== null && u.daysRemaining > 0)
        .reduce((acc, u) => acc + (u.daysRemaining ?? 0), 0) /
        (urls.filter((u) => u.daysRemaining !== null && u.daysRemaining > 0).length || 1);

    const serviceUp = urls.filter((u) => u.serviceStatus === "UP").length;
    const serviceDown = urls.filter((u) => u.serviceStatus === "DOWN").length;
    const serviceDegraded = urls.filter((u) => u.serviceStatus === "DEGRADED").length;
    const uptimePct = total > 0 ? Math.round((serviceUp / total) * 100) : 0;
    const avgResponseTime = Math.round(
      urls.filter((u) => u.responseTime != null && u.responseTime > 0)
        .reduce((acc, u) => acc + (u.responseTime ?? 0), 0) /
        (urls.filter((u) => u.responseTime != null && u.responseTime > 0).length || 1)
    );

    return { total, good, warning, expired, error, pending, starred, healthPct, avgDays: Math.round(avgDays), serviceUp, serviceDown, serviceDegraded, uptimePct, avgResponseTime };
  }, [urls]);

  // ─── Donut data ───
  const donutData = useMemo(() => {
    const items = [
      { name: "Good", value: stats.good, color: COLORS.good },
      { name: "Warning", value: stats.warning, color: COLORS.warning },
      { name: "Expired", value: stats.expired, color: COLORS.expired },
      { name: "Error", value: stats.error, color: COLORS.error },
      { name: "Pending", value: stats.pending, color: COLORS.pending },
    ].filter((d) => d.value > 0);
    return items.length > 0 ? items : [{ name: "None", value: 1, color: "hsl(220, 17%, 18%)" }];
  }, [stats]);

  // ─── Expiry forecast ───
  const expiryForecast = useMemo(() => {
    const buckets = [
      { range: "Expired", min: -Infinity, max: 0, color: COLORS.expired },
      { range: "< 7 days", min: 0, max: 7, color: "#ef4444" },
      { range: "7–30 days", min: 7, max: 30, color: COLORS.warning },
      { range: "30–60 days", min: 30, max: 60, color: "#a3e635" },
      { range: "60–90 days", min: 60, max: 90, color: COLORS.good },
      { range: "> 90 days", min: 90, max: Infinity, color: COLORS.primary },
    ];

    return buckets.map((b) => ({
      range: b.range,
      count: urls.filter((u) => {
        if (u.daysRemaining === null) return false;
        return u.daysRemaining > b.min && u.daysRemaining <= b.max;
      }).length,
      color: b.color,
    }));
  }, [urls]);

  // ─── Issuer breakdown ───
  const issuerData = useMemo(() => {
    const map: Record<string, number> = {};
    urls.forEach((u) => {
      const issuer = u.issuer || "Unknown";
      map[issuer] = (map[issuer] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));
  }, [urls]);

  // ─── Health gauge data ───
  const healthGauge = useMemo(() => {
    const grade = getHealthGrade(stats.healthPct);
    return [{ name: "health", value: stats.healthPct, fill: grade.color }];
  }, [stats.healthPct]);

  const healthGrade = getHealthGrade(stats.healthPct);

  // ─── Critical assets (starred with issues) ───
  const criticalAssets = useMemo(() => {
    return urls
      .filter((u) => u.starred)
      .sort((a, b) => (a.daysRemaining ?? -1) - (b.daysRemaining ?? -1))
      .slice(0, 5);
  }, [urls]);

  if (urls.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Add URLs to view executive dashboard</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 bg-background/50">
      {/* ── Row 1: KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Monitored"
          value={stats.total}
          icon={<Shield className="w-4 h-4" />}
          accent={COLORS.primary}
        />
        <KpiCard
          label="Health Rate"
          value={`${stats.healthPct}%`}
          icon={stats.healthPct >= 80 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          accent={stats.healthPct >= 80 ? COLORS.good : COLORS.warning}
          sub={`Grade ${healthGrade.label}`}
          subColor={healthGrade.color}
        />
        <KpiCard
          label="Needs Attention"
          value={stats.warning + stats.expired + stats.error}
          icon={<AlertTriangle className="w-4 h-4" />}
          accent={COLORS.expired}
          sub={`${stats.expired} expired · ${stats.warning} warning`}
        />
        <KpiCard
          label="Service Uptime"
          value={`${stats.uptimePct}%`}
          icon={<Activity className="w-4 h-4" />}
          accent={stats.uptimePct >= 90 ? COLORS.good : stats.uptimePct >= 70 ? COLORS.warning : COLORS.expired}
          sub={`${stats.serviceUp} up · ${stats.serviceDown} down · avg ${stats.avgResponseTime}ms`}
        />
      </div>

      {/* ── Row 2: Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Health Score Gauge */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-4 flex flex-col items-center justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Health Score
          </span>
          <div className="relative w-full max-w-[160px] aspect-square">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="70%"
                outerRadius="100%"
                data={healthGauge}
                startAngle={210}
                endAngle={-30}
                barSize={12}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={6}
                  background={{ fill: "hsl(220, 17%, 14%)" }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black tracking-tight" style={{ color: healthGrade.color }}>
                {healthGrade.label}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                {stats.healthPct}% healthy
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> {stats.good} valid
            </span>
            <span className="flex items-center gap-1">
              <ShieldX className="w-3 h-3 text-rose-400" /> {stats.expired} expired
            </span>
          </div>
        </div>

        {/* Status Distribution Donut */}
        <div className="lg:col-span-4 rounded-xl border border-border bg-card p-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Certificate Status Distribution
          </span>
          <div className="relative mt-2" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  innerRadius="60%"
                  outerRadius="85%"
                  dataKey="value"
                  stroke="none"
                  paddingAngle={2}
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => [value, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-foreground tabular-nums">{stats.total}</span>
              <span className="text-[10px] text-muted-foreground">certificates</span>
            </div>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
            {donutData.filter(d => d.name !== "None").map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name} <span className="font-semibold text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expiry Forecast */}
        <div className="lg:col-span-5 rounded-xl border border-border bg-card p-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Expiry Forecast
          </span>
          <div className="mt-2" style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={expiryForecast}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={COLORS.gridLine}
                  vertical={false}
                />
                <XAxis
                  dataKey="range"
                  tick={{ fill: COLORS.textMuted, fontSize: 10 }}
                  axisLine={{ stroke: COLORS.gridLine }}
                  tickLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fill: COLORS.textDim, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <RechartsTooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  formatter={(value: number) => [value, "Certificates"]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={28}>
                  {expiryForecast.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Row 3: Issuer Breakdown + Starred Assets ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Issuer Breakdown */}
        <div className="lg:col-span-7 rounded-xl border border-border bg-card p-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Top Certificate Issuers
          </span>
          {issuerData.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-xs text-muted-foreground">No issuer data</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2.5">
              {issuerData.map((item, i) => {
                const maxCount = issuerData[0].count;
                const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                const barColor = i === 0 ? COLORS.primary : i === 1 ? COLORS.good : "hsl(215, 20%, 45%)";

                return (
                  <div key={item.name} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Lock className="w-3 h-3 flex-shrink-0 text-muted-foreground/50" />
                        <span className="text-xs font-medium text-foreground truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-muted-foreground ml-3">
                        {item.count}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Starred / Critical Assets */}
        <div className="lg:col-span-5 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Starred Critical Assets
            </span>
            <span className="text-[10px] font-bold text-amber-400 tabular-nums">
              {stats.starred} flagged
            </span>
          </div>
          {criticalAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 text-center">
              <Star className="w-5 h-5 text-muted-foreground/20 mb-2" />
              <p className="text-xs text-muted-foreground">No starred assets</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Star URLs from the table to track them here
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {criticalAssets.map((item) => {
                const daysColor =
                  item.daysRemaining === null || item.daysRemaining <= 0
                    ? COLORS.expired
                    : item.daysRemaining <= 7
                      ? COLORS.expired
                      : item.daysRemaining <= 30
                        ? COLORS.warning
                        : COLORS.good;

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 bg-background/50 border border-border/50 hover:border-amber-400/20 transition-colors"
                  >
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {extractHostname(item.url)}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.issuer || "Unknown issuer"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span
                        className="text-xs font-bold tabular-nums"
                        style={{ color: daysColor }}
                      >
                        {item.daysRemaining !== null
                          ? item.daysRemaining <= 0
                            ? "EXP"
                            : `${item.daysRemaining}d`
                          : "—"}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0 rounded"
                        style={{
                          color: STATUS_COLORS[item.status],
                          backgroundColor: `${STATUS_COLORS[item.status]}15`,
                        }}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

// ═══════════════════════════════════════════════════
// KPI Card
// ═══════════════════════════════════════════════════
function KpiCard({
  label,
  value,
  icon,
  accent,
  sub,
  subColor,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="relative rounded-xl border border-border bg-card p-4 overflow-hidden group">
      {/* Accent glow */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500"
        style={{ backgroundColor: accent }}
      />

      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span style={{ color: accent }} className="opacity-60">
          {icon}
        </span>
      </div>
      <div className="text-2xl font-black tracking-tight text-foreground tabular-nums">
        {value}
      </div>
      {sub && (
        <p className="text-[10px] mt-1" style={{ color: subColor || COLORS.textMuted }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export default SSLExecutiveDashboard;
