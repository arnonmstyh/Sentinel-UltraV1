import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { useIncidents } from "@/context/useIncidents";
import { useMemo, useState } from "react";

interface ArcDatum {
  key: string;
  label: string;
  value: number;
  pct: number;
  color: string;
  glow: string;
  startAngle: number;
  endAngle: number;
}

const STATUS_META: { key: string; label: string; color: string; glow: string }[] = [
  { key: "open",          label: "Open",          color: "#ef4444", glow: "#ef444460" },
  { key: "investigating", label: "Investigating", color: "#f59e0b", glow: "#f59e0b60" },
  { key: "resolved",      label: "Resolved",      color: "#22c55e", glow: "#22c55e60" },
  { key: "closed",        label: "Closed",        color: "#6b7280", glow: "#6b728060" },
];

function describeArc(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startDeg: number, endDeg: number,
): string {
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
  const sweep = Math.min(endDeg - startDeg, 359.999);
  const end = startDeg + sweep;

  const x1 = cx + outerR * Math.cos(toRad(startDeg));
  const y1 = cy + outerR * Math.sin(toRad(startDeg));
  const x2 = cx + outerR * Math.cos(toRad(end));
  const y2 = cy + outerR * Math.sin(toRad(end));
  const x3 = cx + innerR * Math.cos(toRad(end));
  const y3 = cy + innerR * Math.sin(toRad(end));
  const x4 = cx + innerR * Math.cos(toRad(startDeg));
  const y4 = cy + innerR * Math.sin(toRad(startDeg));

  const large = sweep > 180 ? 1 : 0;

  return [
    `M ${x1} ${y1}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
}

const StatusDistribution = () => {
  const { incidents, loading } = useIncidents();
  const [hovered, setHovered] = useState<string | null>(null);

  const { arcs, total, resolvedPct } = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });
    const tot = incidents.length || 1;

    const gap = 3;
    let cursor = 0;

    const result: ArcDatum[] = STATUS_META
      .map(meta => {
        const val = counts[meta.key] || 0;
        const pct = val / tot;
        const sweep = pct * (360 - gap * STATUS_META.length);
        const arc: ArcDatum = {
          ...meta,
          value: val,
          pct,
          startAngle: cursor,
          endAngle: cursor + sweep,
        };
        cursor += sweep + gap;
        return arc;
      })
      .filter(a => a.value > 0);

    const resolved = (counts["resolved"] || 0) + (counts["closed"] || 0);
    const rPct = incidents.length > 0 ? Math.round((resolved / incidents.length) * 100) : 0;

    return { arcs: result, total: incidents.length, resolvedPct: rPct };
  }, [incidents]);

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 92;
  const innerR = 62;
  const trackR = 96;

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border">
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Status Distribution</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">Loading...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-6">
          {/* Chart */}
          <div className="w-[200px] h-[200px] flex-shrink-0">
            <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%">
              <defs>
                {STATUS_META.map(m => (
                  <filter key={m.key} id={`glow-st-${m.key}`}>
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feFlood floodColor={m.glow} result="color" />
                    <feComposite in="color" in2="blur" operator="in" result="shadow" />
                    <feMerge>
                      <feMergeNode in="shadow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                ))}

                {/* Gradient for the resolution ring */}
                <linearGradient id="resolve-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#16a34a" />
                </linearGradient>
              </defs>

              {/* Outer track ring */}
              <circle cx={cx} cy={cy} r={trackR} fill="none" stroke="hsl(var(--border))" strokeWidth={2.5} opacity={0.4} />

              {/* Background track */}
              <circle cx={cx} cy={cy} r={(outerR + innerR) / 2} fill="none" stroke="hsl(var(--muted))" strokeWidth={outerR - innerR} opacity={0.06} />

              {/* Arcs */}
              {arcs.map((arc) => {
                const isHovered = hovered === arc.key;
                return (
                  <path
                    key={arc.key}
                    d={describeArc(cx, cy, isHovered ? outerR + 3 : outerR, isHovered ? innerR - 2 : innerR, arc.startAngle, arc.endAngle)}
                    fill={arc.color}
                    opacity={hovered && !isHovered ? 0.4 : 0.9}
                    filter={isHovered ? `url(#glow-st-${arc.key})` : undefined}
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHovered(arc.key)}
                    onMouseLeave={() => setHovered(null)}
                  />
                );
              })}

              {/* Inner ring border */}
              <circle cx={cx} cy={cy} r={innerR - 1} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={1} opacity={0.3} />

              {/* Center content */}
              {hovered ? (
                <>
                  <text x={cx} y={cy - 8} textAnchor="middle" fill={arcs.find(a => a.key === hovered)?.color || "hsl(var(--foreground))"} fontSize={28} fontWeight="bold">
                    {arcs.find(a => a.key === hovered)?.value || 0}
                  </text>
                  <text x={cx} y={cy + 12} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>
                    {arcs.find(a => a.key === hovered)?.label}
                  </text>
                </>
              ) : (
                <>
                  <text x={cx} y={cy - 8} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={28} fontWeight="bold">{total}</text>
                  <text x={cx} y={cy + 12} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>Total</text>
                </>
              )}
            </svg>
          </div>

          {/* Right side: resolution metric + legend */}
          <div className="flex-1 min-w-0 pt-2">
            {/* Resolution rate highlight */}
            <div className="mb-4 pb-4 border-b border-border/50">
              <div className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">Resolution Rate</div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold leading-none ${resolvedPct >= 60 ? "text-emerald-400" : resolvedPct >= 30 ? "text-amber-400" : "text-red-400"}`}>
                  {resolvedPct}%
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted/20 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${resolvedPct}%`,
                    background: "linear-gradient(90deg, #22c55e, #16a34a)",
                  }}
                />
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2.5">
              {STATUS_META.map(meta => {
                const arc = arcs.find(a => a.key === meta.key);
                const count = arc?.value || 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const isActive = hovered === meta.key;

                return (
                  <div
                    key={meta.key}
                    className={`flex items-center gap-3 group cursor-pointer transition-all duration-200 rounded-md px-2 py-1 -mx-2 ${
                      isActive ? "bg-white/5" : "hover:bg-white/[0.03]"
                    }`}
                    onMouseEnter={() => setHovered(meta.key)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: meta.color }} />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors flex-1">
                      {meta.label}
                    </span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">{count}</span>
                    <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatusDistribution;
