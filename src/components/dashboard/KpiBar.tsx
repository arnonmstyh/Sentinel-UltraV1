import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useIncidents } from "@/context/useIncidents";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  AlertTriangle,
  Clock,
  Users,
  CheckCircle2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";

/** Parse a responseTime string like "28/10/2025, 10:19:00" into a Date, or null. */
function parseResponseTime(rt: string | null | undefined): Date | null {
  if (!rt || typeof rt !== "string") return null;
  // Expected format: "DD/MM/YYYY, HH:mm:ss"
  const match = rt.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2}):(\d{2})$/
  );
  if (!match) return null;
  const [, day, month, year, hours, minutes, seconds] = match;
  const d = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds)
  );
  return isNaN(d.getTime()) ? null : d;
}

/** Format milliseconds to "Xh Ym" */
function formatDuration(ms: number): string {
  if (!isFinite(ms) || ms < 0) return "N/A";
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: string;
  trend?: "up" | "down" | "neutral";
  sparklineData?: { value: number }[];
}

const KpiCard = ({
  icon: Icon,
  label,
  value,
  accent,
  trend,
  sparklineData,
}: KpiCardProps) => {
  const iconColor = accent || "text-primary";

  return (
    <Card className="bg-gradient-card border-border transition-all duration-300 hover:shadow-glow hover:border-primary/40">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <div className="flex items-center gap-2">
              <p
                className={`text-2xl font-bold truncate ${accent || "text-foreground"}`}
              >
                {value}
              </p>
              {trend && trend !== "neutral" && (
                <span className="flex-shrink-0">
                  {trend === "up" ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                </span>
              )}
            </div>
            {/* Sparkline rendered below the value */}
            {sparklineData && sparklineData.length > 0 && (
              <div className="mt-2">
                <ResponsiveContainer width={80} height={30}>
                  <AreaChart data={sparklineData}>
                    <defs>
                      <linearGradient
                        id="sparkGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="100%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={1.5}
                      fill="url(#sparkGradient)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
        </div>
      </CardContent>
    </Card>
  );
};

const KpiBar = () => {
  const { incidents } = useIncidents();

  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Build date boundaries for current 7 days and previous 7 days
    const current7Start = new Date(today);
    current7Start.setDate(current7Start.getDate() - 6); // 7 days including today

    const prev7Start = new Date(current7Start);
    prev7Start.setDate(prev7Start.getDate() - 7);
    const prev7End = new Date(current7Start);
    prev7End.setDate(prev7End.getDate() - 1);

    // Partition incidents by week
    const currentWeek = incidents.filter(
      (i) => i.createdAt >= current7Start && i.createdAt <= now
    );
    const prevWeek = incidents.filter(
      (i) => i.createdAt >= prev7Start && i.createdAt <= prev7End
    );

    // --- Total Incidents ---
    const total = incidents.length;
    const totalCurrent = currentWeek.length;
    const totalPrev = prevWeek.length;
    const totalTrend: "up" | "down" | "neutral" =
      totalCurrent > totalPrev
        ? "up"
        : totalCurrent < totalPrev
          ? "down"
          : "neutral";

    // --- Sparkline: count per day for last 7 days ---
    const sparklineData: { value: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const dayStart = new Date(current7Start);
      dayStart.setDate(dayStart.getDate() + d);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const count = incidents.filter(
        (i) => i.createdAt >= dayStart && i.createdAt < dayEnd
      ).length;
      sparklineData.push({ value: count });
    }

    // --- Open Incidents ---
    const openIncidents = incidents.filter(
      (i) => i.status !== "resolved" && i.status !== "closed"
    );
    const openCount = openIncidents.length;
    const openCurrent = currentWeek.filter(
      (i) => i.status !== "resolved" && i.status !== "closed"
    ).length;
    const openPrev = prevWeek.filter(
      (i) => i.status !== "resolved" && i.status !== "closed"
    ).length;
    const openTrend: "up" | "down" | "neutral" =
      openCurrent > openPrev
        ? "up"
        : openCurrent < openPrev
          ? "down"
          : "neutral";

    // --- Critical Incidents ---
    const criticalCount = incidents.filter(
      (i) => i.severity === "critical"
    ).length;
    const criticalCurrent = currentWeek.filter(
      (i) => i.severity === "critical"
    ).length;
    const criticalPrev = prevWeek.filter(
      (i) => i.severity === "critical"
    ).length;
    const criticalTrend: "up" | "down" | "neutral" =
      criticalCurrent > criticalPrev
        ? "up"
        : criticalCurrent < criticalPrev
          ? "down"
          : "neutral";

    // --- Response Rate ---
    const respondedTotal = incidents.filter(
      (i) => i.responseStatus === "responded"
    ).length;
    const responseRate = total ? Math.round((respondedTotal / total) * 100) : 0;
    const respondedCurrent = currentWeek.filter(
      (i) => i.responseStatus === "responded"
    ).length;
    const responseRateCurrent = totalCurrent
      ? Math.round((respondedCurrent / totalCurrent) * 100)
      : 0;
    const respondedPrev = prevWeek.filter(
      (i) => i.responseStatus === "responded"
    ).length;
    const responseRatePrev = totalPrev
      ? Math.round((respondedPrev / totalPrev) * 100)
      : 0;
    const responseRateTrend: "up" | "down" | "neutral" =
      responseRateCurrent > responseRatePrev
        ? "up"
        : responseRateCurrent < responseRatePrev
          ? "down"
          : "neutral";

    // --- MTTR (Mean Time to Respond) ---
    const responseDurations: number[] = [];
    incidents.forEach((i) => {
      const rt = parseResponseTime(i.responseTime);
      if (rt && i.createdAt) {
        const diff = rt.getTime() - new Date(i.createdAt).getTime();
        if (diff >= 0) {
          responseDurations.push(diff);
        }
      }
    });
    const mttr =
      responseDurations.length > 0
        ? formatDuration(
            responseDurations.reduce((a, b) => a + b, 0) /
              responseDurations.length
          )
        : "N/A";

    // MTTR trend: compare current vs prev week
    const mttrDurations = (week: typeof incidents) => {
      const durations: number[] = [];
      week.forEach((i) => {
        const rt = parseResponseTime(i.responseTime);
        if (rt && i.createdAt) {
          const diff = rt.getTime() - new Date(i.createdAt).getTime();
          if (diff >= 0) durations.push(diff);
        }
      });
      return durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : null;
    };
    const mttrCurrent = mttrDurations(currentWeek);
    const mttrPrev = mttrDurations(prevWeek);
    // For MTTR, lower is better, so "up" (green) means it decreased
    const mttrTrend: "up" | "down" | "neutral" =
      mttrCurrent === null || mttrPrev === null
        ? "neutral"
        : mttrCurrent < mttrPrev
          ? "up"
          : mttrCurrent > mttrPrev
            ? "down"
            : "neutral";

    // --- Top Responder ---
    const responderCounts: Record<string, number> = {};
    incidents.forEach((i) => {
      const r = (i.responder || "").trim();
      if (!r || r === "Unassigned") return;
      responderCounts[r] = (responderCounts[r] || 0) + 1;
    });
    const topResponder =
      Object.entries(responderCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "-";

    // Top responder trend: compare current vs prev week top
    const topCountWeek = (week: typeof incidents) => {
      const counts: Record<string, number> = {};
      week.forEach((i) => {
        const r = (i.responder || "").trim();
        if (!r || r === "Unassigned") return;
        counts[r] = (counts[r] || 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      return top ? top[1] : 0;
    };
    const topCurrent = topCountWeek(currentWeek);
    const topPrev = topCountWeek(prevWeek);
    const topTrend: "up" | "down" | "neutral" =
      topCurrent > topPrev
        ? "up"
        : topCurrent < topPrev
          ? "down"
          : "neutral";

    return {
      total,
      totalTrend,
      sparklineData,
      openCount,
      openTrend,
      criticalCount,
      criticalTrend,
      responseRate,
      responseRateTrend,
      mttr,
      mttrTrend,
      topResponder,
      topTrend,
    };
  }, [incidents]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <KpiCard
        icon={Activity}
        label="Total Incidents"
        value={stats.total}
        trend={stats.totalTrend}
        sparklineData={stats.sparklineData}
      />
      <KpiCard
        icon={Shield}
        label="Open Incidents"
        value={stats.openCount}
        accent="text-high"
        trend={stats.openTrend}
      />
      <KpiCard
        icon={AlertTriangle}
        label="Critical Incidents"
        value={stats.criticalCount}
        accent="text-critical"
        trend={stats.criticalTrend}
      />
      <KpiCard
        icon={CheckCircle2}
        label="Response Rate"
        value={`${stats.responseRate}%`}
        accent="text-green-500"
        trend={stats.responseRateTrend}
      />
      <KpiCard
        icon={Clock}
        label="MTTR (Mean Time to Respond)"
        value={stats.mttr}
        trend={stats.mttrTrend}
      />
      <KpiCard
        icon={Users}
        label="Top Responder"
        value={stats.topResponder}
        trend={stats.topTrend}
      />
    </div>
  );
};

export default KpiBar;
