import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIncidents } from "@/context/useIncidents";
import { useMemo, useState } from "react";

const FALLBACK_COLORS = [
  "#ef4444", "#ec4899", "#a855f7", "#3b82f6", "#06b6d4",
  "#f59e0b", "#f97316", "#22c55e", "#eab308", "#14b8a6",
];

const TYPE_COLORS: Record<string, string> = {
  "TCP handshake violation. First packet not SYN": "#ef4444",
  "Invalid TCP Flags": "#ec4899",
  "Geolocation Permanent": "#f59e0b",
  "TCP Scan": "#3b82f6",
  "ERT Active Attacker: TOR": "#06b6d4",
  "malware": "#a855f7",
  "phishing": "#f97316",
  "dos": "#22c55e",
  "data-breach": "#eab308",
  "unauthorized-access": "#14b8a6",
  "tcp-scan": "#3b82f6",
  "invalid-tcp-flags": "#ec4899",
  "tcp-handshake-violation": "#ef4444",
  "geolocation-permanent": "#f59e0b",
  "other": "#6b7280",
};

const SHORT_NAMES: Record<string, string> = {
  "TCP handshake violation. First packet not SYN": "TCP Handshake Violation",
  "Invalid TCP Flags": "Invalid TCP Flags",
  "Geolocation Permanent": "Geolocation Permanent",
  "TCP Scan": "TCP Scan",
  "ERT Active Attacker: TOR": "TOR Active Attacker",
};

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 10,
  high: 7,
  medium: 4,
  low: 1,
};

// ---- SVG Polar Area (Coxcomb / Nightingale Rose) Chart ----

interface SliceData {
  name: string;
  value: number;
  color: string;
  ratio: number; // 0-1, how far this slice extends
}

/**
 * Build an SVG arc path for a polar-area slice.
 * Each slice has equal angle but variable outer radius.
 */
function polarSlicePath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number, // degrees, 0 = top (12 o'clock)
  endAngle: number,
  gap: number = 1.5, // degrees gap between slices
): string {
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;

  const a1 = startAngle + gap / 2;
  const a2 = endAngle - gap / 2;
  if (a2 <= a1) return "";

  const r1 = innerR;
  const r2 = outerR;

  const x1 = cx + r2 * Math.cos(toRad(a1));
  const y1 = cy + r2 * Math.sin(toRad(a1));
  const x2 = cx + r2 * Math.cos(toRad(a2));
  const y2 = cy + r2 * Math.sin(toRad(a2));
  const x3 = cx + r1 * Math.cos(toRad(a2));
  const y3 = cy + r1 * Math.sin(toRad(a2));
  const x4 = cx + r1 * Math.cos(toRad(a1));
  const y4 = cy + r1 * Math.sin(toRad(a1));

  const largeArc = a2 - a1 > 180 ? 1 : 0;

  return [
    `M ${x1} ${y1}`,
    `A ${r2} ${r2} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${r1} ${r1} 0 ${largeArc} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
}

interface PolarAreaChartProps {
  data: SliceData[];
  size: number;
}

const PolarAreaChart = ({ data, size }: PolarAreaChartProps) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const outerMax = size / 2 - 4; // leave room for the outer ring
  const innerR = outerMax * 0.30; // donut hole
  const minOuterR = outerMax * 0.40; // minimum slice radius
  const outerRingR = outerMax + 2;

  const sliceAngle = data.length > 0 ? 360 / data.length : 0;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      className="overflow-visible"
    >
      {/* Outer ring track */}
      <circle
        cx={cx}
        cy={cy}
        r={outerRingR}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth={3}
        opacity={0.5}
      />

      {/* Inner ring track (donut hole border) */}
      <circle
        cx={cx}
        cy={cy}
        r={innerR - 1}
        fill="hsl(var(--card))"
        stroke="hsl(var(--border))"
        strokeWidth={1}
        opacity={0.3}
      />

      {/* Slices */}
      {data.map((slice, i) => {
        const startAngle = i * sliceAngle;
        const endAngle = (i + 1) * sliceAngle;
        // Radius proportional to value ratio, with a minimum so small values are visible
        const sliceOuterR = minOuterR + (outerMax - minOuterR) * slice.ratio;
        const isHovered = hoveredIdx === i;

        return (
          <g key={slice.name}>
            {/* Background track for this slice (shows full potential radius) */}
            <path
              d={polarSlicePath(cx, cy, innerR, outerMax, startAngle, endAngle, 2)}
              fill="hsl(var(--muted))"
              opacity={0.08}
            />
            {/* Actual data slice */}
            <path
              d={polarSlicePath(cx, cy, innerR, sliceOuterR, startAngle, endAngle, 2)}
              fill={slice.color}
              opacity={isHovered ? 1 : 0.85}
              className="transition-all duration-200 cursor-pointer"
              style={{
                filter: isHovered ? `drop-shadow(0 0 8px ${slice.color}80)` : "none",
                transform: isHovered ? `scale(1.02)` : "scale(1)",
                transformOrigin: `${cx}px ${cy}px`,
              }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          </g>
        );
      })}

      {/* Hover tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <g>
          <rect
            x={cx - 50}
            y={cy - 18}
            width={100}
            height={36}
            rx={6}
            fill="hsl(var(--popover))"
            stroke="hsl(var(--border))"
            strokeWidth={1}
            opacity={0.95}
          />
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            fill="hsl(var(--foreground))"
            fontSize={10}
            fontWeight={600}
          >
            {data[hoveredIdx].name.length > 18
              ? data[hoveredIdx].name.slice(0, 16) + "…"
              : data[hoveredIdx].name}
          </text>
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize={11}
            fontWeight={500}
          >
            {data[hoveredIdx].value} incidents
          </text>
        </g>
      )}
    </svg>
  );
};

// ---- Main Component ----

const TypeDistribution = () => {
  const { incidents } = useIncidents();

  const { chartData, riskScore, riskLabel, legendItems } = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach(i => {
      counts[i.type] = (counts[i.type] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    // Show top 8 types, group the rest as "Other"
    const MAX_TYPES = 8;
    const topTypes = sorted.slice(0, MAX_TYPES);
    const otherTypes = sorted.slice(MAX_TYPES);
    const otherCount = otherTypes.reduce((sum, [, c]) => sum + c, 0);

    const displayTypes = [...topTypes];
    if (otherCount > 0) {
      displayTypes.push(["Other", otherCount]);
    }

    const max = displayTypes.length > 0 ? displayTypes[0][1] as number : 1;

    const slices: SliceData[] = displayTypes.map(([type, count], idx) => ({
      name: type === "Other" ? `Other (${otherTypes.length})` : (SHORT_NAMES[type as string] || (type as string)),
      value: count as number,
      color: type === "Other" ? "#6b7280" : (TYPE_COLORS[type as string] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]),
      ratio: max > 0 ? (count as number) / max : 0,
    }));

    const legend = slices.map(d => ({
      name: d.name,
      color: d.color,
      count: d.value,
    }));

    // Risk score: severity-weighted
    let totalWeight = 0;
    let maxPossible = 0;
    incidents.forEach(i => {
      totalWeight += SEVERITY_WEIGHT[i.severity] || 1;
      maxPossible += 10;
    });
    const score = maxPossible > 0
      ? Math.round((totalWeight / maxPossible) * 100 * 10) / 10
      : 0;

    let label = "Low risk";
    if (score >= 70) label = "High risk";
    else if (score >= 40) label = "Medium risk";

    return { chartData: slices, riskScore: score, riskLabel: label, legendItems: legend };
  }, [incidents]);

  if (incidents.length === 0) {
    return (
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Incident Types</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          No incident data
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader className="pb-2">
        <CardTitle>Incident Types</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-6">
          {/* Polar Area Chart */}
          <div className="w-[200px] h-[200px] flex-shrink-0">
            <PolarAreaChart data={chartData} size={200} />
          </div>

          {/* Right side: score + legend */}
          <div className="flex-1 min-w-0 pt-1">
            {/* Risk score */}
            <div className="mb-5">
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-bold leading-none ${
                  riskScore >= 70 ? "text-red-400" : riskScore >= 40 ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {riskScore}
                </span>
                <span className={`text-sm font-medium ${
                  riskScore >= 70 ? "text-red-400/70" : riskScore >= 40 ? "text-amber-400/70" : "text-emerald-400/70"
                }`}>
                  {riskLabel}
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {legendItems.map((item) => (
                <div key={item.name} className="flex items-center gap-2 group">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate flex-1 min-w-0">
                    {item.name}
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-foreground flex-shrink-0">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TypeDistribution;
