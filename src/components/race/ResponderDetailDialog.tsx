import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Activity, Timer, AlertTriangle, Zap, Flag, Target } from "lucide-react";
import {
  formatLapTime,
  SCORE_WEIGHTS,
  type RaceResponder,
} from "@/lib/raceMetrics";

interface Props {
  responder: RaceResponder | null;
  rank: number;
  fastestLapMs: number;
  fieldSize: number;
  onClose: () => void;
}

const ResponderDetailDialog = ({
  responder,
  rank,
  fastestLapMs,
  fieldSize,
  onClose,
}: Props) => {
  return (
    <Dialog open={!!responder} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-5xl border-border/60 bg-[hsl(220_26%_6%)] p-0 gap-0 overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {responder && (
          <DialogContent_Inner
            responder={responder}
            rank={rank}
            fastestLapMs={fastestLapMs}
            fieldSize={fieldSize}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

const DialogContent_Inner = ({
  responder,
  rank,
  fastestLapMs,
  fieldSize,
}: {
  responder: RaceResponder;
  rank: number;
  fastestLapMs: number;
  fieldSize: number;
}) => {
  const { teamColor, code, name, score, breakdown, lapHistory } = responder;
  const holdsFastest =
    responder.bestResponseMs > 0 && responder.bestResponseMs === fastestLapMs;
  const resolvedRate =
    responder.totalIncidents > 0
      ? (responder.resolved / responder.totalIncidents) * 100
      : 0;
  const avgResponseMs =
    lapHistory.length > 0
      ? lapHistory.reduce((a, b) => a + b, 0) / lapHistory.length
      : 0;

  return (
    <>
      {/* Header banner with team color */}
      <DialogHeader className="relative p-0">
        <div
          className="relative overflow-hidden px-6 py-5"
          style={{
            background: `linear-gradient(135deg, ${teamColor}26 0%, hsl(220 26% 6%) 70%)`,
            borderBottom: `1px solid ${teamColor}44`,
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent 0 2px, rgba(255,255,255,0.8) 2px 3px)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full blur-3xl"
            style={{ background: `radial-gradient(closest-side, ${teamColor}60, transparent)` }}
          />
          <div className="relative flex items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-md font-mono text-3xl font-black tabular-nums ${
                  rank === 1
                    ? "bg-gradient-to-br from-yellow-300 to-yellow-600 text-black shadow-[0_0_24px_hsl(45_93%_47%/0.55)]"
                    : rank === 2
                    ? "bg-gradient-to-br from-slate-200 to-slate-400 text-black"
                    : rank === 3
                    ? "bg-gradient-to-br from-amber-500 to-amber-800 text-black"
                    : "border border-border/60 bg-secondary/80 text-foreground"
                }`}
              >
                {rank}
              </div>
              <div className="h-14 w-1.5 rounded-sm" style={{ backgroundColor: teamColor, boxShadow: `0 0 16px ${teamColor}80` }} />
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="rounded px-2 py-1 font-mono text-base font-black tracking-wider text-white shadow"
                    style={{ backgroundColor: teamColor }}
                  >
                    {code}
                  </span>
                  {holdsFastest && (
                    <span className="flex items-center gap-1 rounded bg-purple-500/25 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-purple-200">
                      <Zap className="h-3 w-3" fill="currentColor" strokeWidth={0} />
                      Fastest Lap
                    </span>
                  )}
                </div>
                <DialogTitle className="mt-1 text-xl font-black text-foreground">
                  {name}
                </DialogTitle>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Rank {rank} of {fieldSize} · Driver Telemetry
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Score
              </div>
              <div className="font-mono text-4xl font-black tabular-nums text-primary [text-shadow:0_0_16px_hsl(193_95%_55%/0.5)]">
                {score.toFixed(1)}
              </div>
              <div className="font-mono text-[10px] tabular-nums text-muted-foreground">
                out of 100
              </div>
            </div>
          </div>
        </div>
      </DialogHeader>

      <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Gauge
            label="Resolved"
            subLabel={`${responder.resolved}/${responder.totalIncidents} · ${resolvedRate.toFixed(0)}%`}
            value={breakdown.resolvedPct}
            max={SCORE_WEIGHTS.resolved * 100}
            color="hsl(142 76% 46%)"
            icon={<Activity className="h-4 w-4" />}
          />
          <Gauge
            label="Time to Respond"
            subLabel={`best ${formatLapTime(responder.bestResponseMs)}`}
            value={breakdown.speedPct}
            max={SCORE_WEIGHTS.speed * 100}
            color="hsl(193 95% 55%)"
            icon={<Timer className="h-4 w-4" />}
          />
          <Gauge
            label="Severity Load"
            subLabel={`${Math.round(responder.severityWeight)} pts weighted`}
            value={breakdown.severityPct}
            max={SCORE_WEIGHTS.severity * 100}
            color="hsl(292 84% 60%)"
            icon={<AlertTriangle className="h-4 w-4" />}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* Response time line chart */}
          <div className="rounded-lg border border-border/60 bg-[hsl(220_20%_8%)] p-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                  <Target className="h-3 w-3" />
                  Response Time History
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  Last {lapHistory.length} laps · lower is better
                </div>
              </div>
              <div className="flex items-center gap-4 font-mono text-[10px]">
                <div className="text-right">
                  <div className="uppercase tracking-widest text-muted-foreground">Best</div>
                  <div className="font-black tabular-nums text-purple-300">
                    {formatLapTime(responder.bestResponseMs)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="uppercase tracking-widest text-muted-foreground">Avg</div>
                  <div className="font-black tabular-nums text-foreground">
                    {formatLapTime(avgResponseMs)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="uppercase tracking-widest text-muted-foreground">Last</div>
                  <div className="font-black tabular-nums text-foreground">
                    {formatLapTime(responder.lastResponseMs)}
                  </div>
                </div>
              </div>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer>
                <LineChart
                  data={lapHistory.map((ms, i) => ({
                    lap: i + 1,
                    seconds: Math.round(ms / 10) / 100,
                  }))}
                  margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 5" stroke="hsl(220 20% 20%)" vertical={false} />
                  <XAxis
                    dataKey="lap"
                    tick={{ fontSize: 10, fill: "hsl(215 20% 55%)", fontFamily: "ui-monospace" }}
                    axisLine={{ stroke: "hsl(220 20% 25%)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(215 20% 55%)", fontFamily: "ui-monospace" }}
                    axisLine={{ stroke: "hsl(220 20% 25%)" }}
                    tickLine={false}
                    unit="s"
                    width={44}
                  />
                  <Tooltip
                    cursor={{ stroke: teamColor, strokeWidth: 1, strokeDasharray: "3 3" }}
                    contentStyle={{
                      background: "hsl(220 20% 10%)",
                      border: "1px solid hsl(220 17% 22%)",
                      borderRadius: 6,
                      fontSize: 11,
                      fontFamily: "ui-monospace",
                    }}
                    labelStyle={{ color: "hsl(215 20% 70%)" }}
                    formatter={(v: number) => [`${v.toFixed(2)}s`, "Response"]}
                  />
                  <ReferenceLine
                    y={responder.bestResponseMs / 1000}
                    stroke="rgba(168,85,247,0.5)"
                    strokeDasharray="4 4"
                    label={{ value: "best", fill: "rgba(168,85,247,0.85)", fontSize: 9, fontFamily: "ui-monospace", position: "right" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="seconds"
                    stroke={teamColor}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: teamColor, stroke: "white", strokeWidth: 1 }}
                    activeDot={{ r: 5, fill: teamColor, stroke: "white", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Severity breakdown bar chart */}
          <div className="rounded-lg border border-border/60 bg-[hsl(220_20%_8%)] p-4">
            <div className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
              Severity Mix
            </div>
            <SeverityBars
              criticals={responder.criticals}
              highs={responder.highs}
              mediums={responder.mediums}
              lows={responder.lows}
            />
            <div className="mt-3 border-t border-border/40 pt-2 font-mono text-[10px] text-muted-foreground">
              Weighted: <span className="font-black text-foreground tabular-nums">{Math.round(responder.severityWeight)}</span> pts
              <span className="text-muted-foreground/70"> (crit×3 + high×2 + med×1 + low×0.5)</span>
            </div>
          </div>
        </div>

        {/* Key metrics row */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Total" value={String(responder.totalIncidents)} icon={<Flag className="h-3.5 w-3.5" />} />
          <MetricCard label="Resolved" value={String(responder.resolved)} accent="emerald" icon={<Activity className="h-3.5 w-3.5" />} />
          <MetricCard label="Rate" value={`${resolvedRate.toFixed(0)}%`} accent="emerald" />
          <MetricCard label="Best Time" value={formatLapTime(responder.bestResponseMs)} accent="cyan" />
          <MetricCard label="Avg Time" value={formatLapTime(avgResponseMs)} accent="cyan" />
          <MetricCard label="Severity" value={`${Math.round(responder.severityWeight)}`} accent="fuchsia" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
        </div>
      </div>
    </>
  );
};

// Half-circle radial gauge
const Gauge = ({
  label,
  subLabel,
  value,
  max,
  color,
  icon,
}: {
  label: string;
  subLabel: string;
  value: number;
  max: number;
  color: string;
  icon: React.ReactNode;
}) => {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const SIZE = 160;
  const STROKE = 14;
  const R = (SIZE - STROKE) / 2;
  const CIRC = Math.PI * R; // half circle
  const offset = CIRC * (1 - pct);

  return (
    <div className="relative rounded-lg border border-border/60 bg-[hsl(220_20%_8%)] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
          {icon}
          {label}
        </div>
        <span
          className="rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest"
          style={{ color, borderColor: `${color}50`, background: `${color}15` }}
        >
          {Math.round(max)}% weight
        </span>
      </div>
      <div className="relative mt-2 flex flex-col items-center">
        <svg
          width={SIZE}
          height={SIZE / 2 + 12}
          viewBox={`0 0 ${SIZE} ${SIZE / 2 + 12}`}
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id={`grad-${label}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity="0.6" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
          {/* background track */}
          <path
            d={`M ${STROKE / 2} ${SIZE / 2} A ${R} ${R} 0 0 1 ${SIZE - STROKE / 2} ${SIZE / 2}`}
            fill="none"
            stroke="hsl(220 20% 14%)"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          {/* value arc */}
          <path
            d={`M ${STROKE / 2} ${SIZE / 2} A ${R} ${R} 0 0 1 ${SIZE - STROKE / 2} ${SIZE / 2}`}
            fill="none"
            stroke={`url(#grad-${label})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 700ms cubic-bezier(0.22, 0.61, 0.36, 1)",
              filter: `drop-shadow(0 0 8px ${color}60)`,
            }}
          />
        </svg>
        <div className="-mt-8 flex flex-col items-center">
          <span
            className="font-mono text-3xl font-black tabular-nums"
            style={{ color, textShadow: `0 0 12px ${color}60` }}
          >
            {value.toFixed(1)}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            contribution
          </span>
          <span className="mt-1 font-mono text-[10px] tabular-nums text-muted-foreground">
            {subLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

const SeverityBars = ({
  criticals,
  highs,
  mediums,
  lows,
}: {
  criticals: number;
  highs: number;
  mediums: number;
  lows: number;
}) => {
  const data = [
    { label: "CRIT", count: criticals, color: "hsl(0 72% 51%)" },
    { label: "HIGH", count: highs, color: "hsl(14 90% 53%)" },
    { label: "MED", count: mediums, color: "hsl(38 92% 50%)" },
    { label: "LOW", count: lows, color: "hsl(45 93% 47%)" },
  ];
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-36 items-end gap-2">
      {data.map((d) => {
        const h = (d.count / max) * 100;
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            <div className="font-mono text-sm font-black tabular-nums text-foreground">
              {d.count}
            </div>
            <div className="flex h-20 w-full items-end">
              <div
                className="w-full rounded-t transition-all duration-500"
                style={{
                  height: `${h}%`,
                  background: `linear-gradient(180deg, ${d.color}, ${d.color}88)`,
                  boxShadow: `inset 0 0 10px rgba(255,255,255,0.15), 0 0 12px ${d.color}50`,
                }}
              />
            </div>
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: d.color }}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const ACCENT: Record<string, string> = {
  emerald: "text-emerald-400 border-emerald-400/40",
  cyan: "text-cyan-400 border-cyan-400/40",
  fuchsia: "text-fuchsia-400 border-fuchsia-400/40",
};

const MetricCard = ({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent?: string;
  icon?: React.ReactNode;
}) => (
  <div className={`rounded-md border border-border/60 bg-[hsl(220_20%_8%)] px-3 py-2 ${accent ? ACCENT[accent] : ""}`}>
    <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className={`mt-0.5 font-mono text-lg font-black tabular-nums ${accent ? "" : "text-foreground"}`}>
      {value}
    </div>
  </div>
);

export default ResponderDetailDialog;
