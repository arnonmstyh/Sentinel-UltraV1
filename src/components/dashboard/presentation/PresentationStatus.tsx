import { motion } from "framer-motion";
import { Activity, Flame, ShieldAlert, BarChart3 } from "lucide-react";
import { useMemo } from "react";
import { useIncidents } from "@/context/useIncidents";

const STATUS_META: { key: string; label: string; color: string; glow: string }[] = [
  { key: "open", label: "Open", color: "#ef4444", glow: "#ef444460" },
  { key: "investigating", label: "Investigating", color: "#f59e0b", glow: "#f59e0b60" },
  { key: "resolved", label: "Resolved", color: "#22c55e", glow: "#22c55e60" },
  { key: "closed", label: "Closed", color: "#6b7280", glow: "#6b728060" },
];

const describeArc = (
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
): string => {
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
};

interface Props {
  reduceMotion: boolean;
}

const PresentationStatus = ({ reduceMotion }: Props) => {
  const { incidents } = useIncidents();

  const { arcs, total, resolvedPct, openCount, criticalCount, investigatingCount } = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach((i) => {
      counts[i.status] = (counts[i.status] || 0) + 1;
    });
    const tot = incidents.length || 1;
    const gap = 3;
    let cursor = 0;
    const result = STATUS_META.map((meta) => {
      const val = counts[meta.key] || 0;
      const pct = val / tot;
      const sweep = pct * (360 - gap * STATUS_META.length);
      const arc = {
        ...meta,
        value: val,
        pct,
        startAngle: cursor,
        endAngle: cursor + sweep,
      };
      cursor += sweep + gap;
      return arc;
    }).filter((a) => a.value > 0);

    const resolved = (counts.resolved || 0) + (counts.closed || 0);
    const rPct = incidents.length > 0 ? Math.round((resolved / incidents.length) * 100) : 0;
    const crit = incidents.filter((i) => i.severity === "critical").length;
    return {
      arcs: result,
      total: incidents.length,
      resolvedPct: rPct,
      openCount: counts.open || 0,
      criticalCount: crit,
      investigatingCount: counts.investigating || 0,
    };
  }, [incidents]);

  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 82;
  const innerR = 56;
  const trackR = 86;

  return (
    <div className="p-4 pt-3">
      {/* Donut + headline rate */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
            <defs>
              {STATUS_META.map((m) => (
                <filter key={m.key} id={`pglow-${m.key}`}>
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feFlood floodColor={m.glow} result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="shadow" />
                  <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
            </defs>

            <circle cx={cx} cy={cy} r={trackR} fill="none" stroke="hsl(var(--border))" strokeWidth={1.5} opacity={0.4} />
            <circle
              cx={cx}
              cy={cy}
              r={(outerR + innerR) / 2}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={outerR - innerR}
              opacity={0.06}
            />

            {arcs.map((arc, i) => (
              <motion.path
                key={arc.key}
                d={describeArc(cx, cy, outerR, innerR, arc.startAngle, arc.endAngle)}
                fill={arc.color}
                opacity={0.92}
                filter={`url(#pglow-${arc.key})`}
                initial={reduceMotion ? { opacity: 0.92 } : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 0.92, scale: 1 }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
                transition={{
                  delay: reduceMotion ? 0 : 0.06 * i,
                  type: "spring",
                  stiffness: 220,
                  damping: 26,
                }}
              />
            ))}

            <circle cx={cx} cy={cy} r={innerR - 1} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={1} opacity={0.5} />

            <text x={cx} y={cy - 4} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={28} fontWeight={800} style={{ fontVariantNumeric: "tabular-nums" }}>
              {total.toLocaleString()}
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={9} letterSpacing={3}>
              INCIDENTS
            </text>
          </svg>
        </div>

        {/* Resolution + KPIs */}
        <div className="flex flex-1 flex-col gap-2">
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 backdrop-blur-sm">
            <div className="font-mono text-[9px] uppercase tracking-[0.26em] text-emerald-300/80">Resolution Rate</div>
            <div className="font-mono text-3xl font-bold tabular-nums leading-none text-emerald-300">{resolvedPct}%</div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-emerald-500/15">
              <motion.div
                initial={reduceMotion ? { width: `${resolvedPct}%` } : { width: 0 }}
                animate={{ width: `${resolvedPct}%` }}
                transition={{
                  delay: reduceMotion ? 0 : 0.2,
                  type: "spring",
                  stiffness: 140,
                  damping: 24,
                }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Kpi icon={<Flame className="h-3 w-3" />} label="Open" value={openCount} accent="text-rose-300" />
            <Kpi icon={<ShieldAlert className="h-3 w-3" />} label="Critical" value={criticalCount} accent="text-rose-400" />
            <Kpi icon={<BarChart3 className="h-3 w-3" />} label="Investigating" value={investigatingCount} accent="text-amber-300" />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 rounded-lg border border-border/50 bg-card/40 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 border-b border-border/40 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
          <Activity className="h-3 w-3 text-primary" />
          Status Breakdown
        </div>
        <div className="divide-y divide-border/30">
          {STATUS_META.map((meta) => {
            const arc = arcs.find((a) => a.key === meta.key);
            const count = arc?.value || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={meta.key} className="flex items-center gap-3 px-3 py-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: meta.color, boxShadow: `0 0 8px ${meta.glow}` }}
                />
                <span className="flex-1 text-xs text-foreground">{meta.label}</span>
                <span className="w-12 text-right font-mono text-sm font-bold tabular-nums text-foreground">
                  {count.toLocaleString()}
                </span>
                <span className="w-10 text-right font-mono text-[10px] tabular-nums text-muted-foreground">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Kpi = ({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) => (
  <div className="rounded-md border border-border/50 bg-card/40 px-2 py-1 backdrop-blur-sm">
    <div className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className={`font-mono text-base font-bold tabular-nums leading-tight ${accent}`}>{value.toLocaleString()}</div>
  </div>
);

export default PresentationStatus;
