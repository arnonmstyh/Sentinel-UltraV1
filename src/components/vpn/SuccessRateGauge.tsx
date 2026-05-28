import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "lucide-react";
import { useMemo } from "react";
import type { VpnAccessRecord } from "@/types/vpn";

// Donut-segment arc path (shared shape with StatusDistribution.tsx).
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

const gaugeColor = (pct: number) => {
  if (pct >= 90) return { fill: "#22c55e", glow: "#22c55e66" };
  if (pct >= 70) return { fill: "#f59e0b", glow: "#f59e0b66" };
  return { fill: "#ef4444", glow: "#ef444466" };
};

const SuccessRateGauge = ({ records }: { records: VpnAccessRecord[] }) => {
  const { rate, success, failure } = useMemo(() => {
    let success = 0;
    let failure = 0;
    records.forEach((r) => {
      if (r.outcome === "success") success += 1;
      else if (r.outcome === "failure") failure += 1;
    });
    const total = records.length;
    return { rate: total > 0 ? success / total : 0, success, failure };
  }, [records]);

  const pct = Math.round(rate * 100);
  const color = gaugeColor(pct);

  // Semicircular gauge geometry — arc sweeps the top half (-90deg to +90deg).
  const cx = 130;
  const cy = 140;
  const outerR = 104;
  const innerR = 72;
  const valueEnd = -90 + 180 * rate;

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-primary" />
          VPN Success Rate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 260 188" width="100%" height="100%" className="max-w-[280px]">
            <defs>
              <filter id="gauge-glow">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feFlood floodColor={color.glow} result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background track */}
            <path
              d={describeArc(cx, cy, outerR, innerR, -90, 90)}
              fill="hsl(var(--muted))"
              opacity={0.18}
            />

            {/* Value arc */}
            {rate > 0 && (
              <path
                d={describeArc(cx, cy, outerR, innerR, -90, valueEnd)}
                fill={color.fill}
                opacity={0.92}
                filter="url(#gauge-glow)"
                className="transition-all duration-700"
              />
            )}

            {/* Scale end labels */}
            <text x={cx - outerR} y={cy + 22} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>0%</text>
            <text x={cx + outerR} y={cy + 22} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>100%</text>

            {/* Center readout */}
            <text x={cx} y={cy - 14} textAnchor="middle" fill={color.fill} fontSize={46} fontWeight="bold">{pct}%</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={12} className="uppercase">Tunnels Established</text>
          </svg>

          {/* Counts */}
          <div className="grid grid-cols-2 gap-3 w-full mt-2">
            <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Success</div>
              <div className="text-xl font-bold text-emerald-400 tabular-nums">{success.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Failed</div>
              <div className="text-xl font-bold text-red-400 tabular-nums">{failure.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SuccessRateGauge;
