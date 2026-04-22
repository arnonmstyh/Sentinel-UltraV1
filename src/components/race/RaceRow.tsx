import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  formatGap,
  formatLapTime,
  type RaceResponder,
} from "@/lib/raceMetrics";

interface RaceRowProps {
  responder: RaceResponder;
  rank: number;
  previousRank: number | undefined;
  leaderScore: number;
  fastestLapMs: number;
  onSelect?: (responder: RaceResponder) => void;
}

// Grid: Pos | Stripe | Driver | Gap | Resolved | Speed (best) | Severity | Pace
const GRID_COLS =
  "grid-cols-[48px_6px_minmax(150px,170px)_84px_104px_112px_150px_minmax(0,1fr)]";

const RaceRow = ({
  responder,
  rank,
  previousRank,
  leaderScore,
  fastestLapMs,
  onSelect,
}: RaceRowProps) => {
  const delta = previousRank != null ? previousRank - rank : 0;
  const [flashDir, setFlashDir] = useState<"up" | "down" | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (delta > 0) setFlashDir("up");
    else if (delta < 0) setFlashDir("down");
    if (delta !== 0) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setFlashDir(null), 1800);
    }
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [delta]);

  const isLeader = rank === 1;
  const holdsFastestLap =
    responder.bestResponseMs > 0 && responder.bestResponseMs === fastestLapMs;
  const resolvedRate =
    responder.totalIncidents > 0
      ? Math.round((responder.resolved / responder.totalIncidents) * 100)
      : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        layout: { type: "spring", stiffness: 420, damping: 36, mass: 0.7 },
        opacity: { duration: 0.25 },
      }}
      className="relative"
    >
      <div
        onClick={() => onSelect?.(responder)}
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
        onKeyDown={(e) => {
          if (!onSelect) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(responder);
          }
        }}
        className={cn(
          "relative grid items-center gap-3 overflow-hidden rounded-md border bg-[hsl(220_20%_7%)] px-2 py-2 transition-all duration-300",
          GRID_COLS,
          "border-border/40",
          onSelect && "cursor-pointer hover:border-primary/60 hover:bg-[hsl(220_20%_8.5%)] hover:shadow-[0_0_20px_hsl(193_95%_55%/0.12)] focus:outline-none focus:ring-1 focus:ring-primary/60",
          !onSelect && "hover:border-border/70",
          flashDir === "up" &&
            "border-success/70 shadow-[0_0_24px_hsl(142_76%_36%/0.28)]",
          flashDir === "down" && "border-destructive/60",
        )}
      >
        <AnimatePresence>
          {flashDir && (
            <motion.div
              key={`flash-${rank}-${delta}`}
              initial={{ opacity: 0.45 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, ease: "easeOut" }}
              className={cn(
                "pointer-events-none absolute inset-0",
                flashDir === "up"
                  ? "bg-gradient-to-r from-success/25 via-success/10 to-transparent"
                  : "bg-gradient-to-r from-destructive/20 via-destructive/8 to-transparent",
              )}
            />
          )}
        </AnimatePresence>

        {/* Position badge */}
        <div className="relative z-10 flex h-10 items-center justify-center">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded font-mono text-base font-black tabular-nums",
              rank === 1 &&
                "bg-gradient-to-br from-yellow-300 to-yellow-600 text-black shadow-[0_0_18px_hsl(45_93%_47%/0.5)]",
              rank === 2 && "bg-gradient-to-br from-slate-200 to-slate-400 text-black",
              rank === 3 && "bg-gradient-to-br from-amber-500 to-amber-800 text-black",
              rank > 3 && "bg-secondary/80 text-foreground border border-border/60",
            )}
          >
            {rank}
          </div>
          <AnimatePresence>
            {delta !== 0 && flashDir && (
              <motion.div
                key={`delta-${rank}-${delta}-${Math.random()}`}
                initial={{ opacity: 0, scale: 0.5, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                className={cn(
                  "absolute -right-0.5 -top-0.5 flex items-center gap-0.5 rounded-full px-1 py-[1px] text-[9px] font-black leading-none shadow-md",
                  delta > 0 ? "bg-success text-white" : "bg-destructive text-white",
                )}
              >
                {delta > 0 ? (
                  <ChevronUp className="h-2.5 w-2.5" strokeWidth={3} />
                ) : (
                  <ChevronDown className="h-2.5 w-2.5" strokeWidth={3} />
                )}
                {Math.abs(delta)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Team stripe */}
        <div
          aria-hidden
          className="relative z-10 h-9 w-1.5 rounded-sm"
          style={{
            backgroundColor: responder.teamColor,
            boxShadow: `0 0 10px ${responder.teamColor}80`,
          }}
        />

        {/* Driver */}
        <div className="relative z-10 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[11px] font-black tracking-wider text-white shadow-sm"
              style={{ backgroundColor: responder.teamColor }}
            >
              {responder.code}
            </span>
            {holdsFastestLap && (
              <span
                title="Overall fastest response"
                className="flex items-center justify-center rounded-sm bg-purple-500/25 px-1 py-0.5 text-purple-300"
              >
                <Zap className="h-2.5 w-2.5" fill="currentColor" strokeWidth={0} />
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
            {responder.name}
          </div>
        </div>

        {/* Gap */}
        <div className="relative z-10 font-mono text-sm font-bold tabular-nums">
          {isLeader ? (
            <span className="text-primary [text-shadow:0_0_8px_hsl(193_95%_55%/0.5)]">
              LEADER
            </span>
          ) : (
            <span className="text-foreground/85">{formatGap(leaderScore, responder.score)}</span>
          )}
        </div>

        {/* RESOLVED */}
        <div className="relative z-10">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-400/80">
            Resolved
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-base font-black tabular-nums text-foreground">
              {responder.resolved}
            </span>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground/80">
              /{responder.totalIncidents}
            </span>
          </div>
          <div className="font-mono text-[9px] font-semibold tabular-nums text-emerald-400/90">
            {resolvedRate}%
          </div>
        </div>

        {/* SPEED (time to response, best) */}
        <div className="relative z-10">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-400/80">
            Time to Respond
          </div>
          <div
            className={cn(
              "font-mono text-sm font-black tabular-nums",
              holdsFastestLap
                ? "text-purple-300 [text-shadow:0_0_8px_rgba(168,85,247,0.55)]"
                : "text-foreground",
            )}
          >
            {formatLapTime(responder.bestResponseMs)}
          </div>
          <div className="font-mono text-[9px] tabular-nums text-muted-foreground">
            last {formatLapTime(responder.lastResponseMs)}
          </div>
        </div>

        {/* SEVERITY */}
        <div className="relative z-10">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-fuchsia-400/80">
            Severity Load
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-base font-black tabular-nums text-foreground">
              {Math.round(responder.severityWeight)}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              pts
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1">
            <SevChip sev="critical" count={responder.criticals} />
            <SevChip sev="high" count={responder.highs} />
            <SevChip sev="medium" count={responder.mediums} />
          </div>
        </div>

        {/* PACE — 3-segment stacked bar */}
        <div className="relative z-10 min-w-0 pr-2">
          <PaceBar breakdown={responder.breakdown} />
        </div>
      </div>
    </motion.div>
  );
};

const PaceBar = ({ breakdown }: { breakdown: RaceResponder["breakdown"] }) => {
  return (
    <div className="relative h-9 w-full overflow-hidden rounded-md border border-border/40 bg-black/60">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {[25, 50, 75].map((p) => (
          <div
            key={p}
            className="absolute inset-y-0 w-px bg-border/40"
            style={{ left: `${p}%` }}
          />
        ))}
      </div>
      <div className="absolute inset-0 flex">
        <motion.div
          initial={false}
          animate={{ width: `${breakdown.resolvedPct}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 22, mass: 0.5 }}
          className="h-full"
          style={{
            background: "linear-gradient(180deg, hsl(142 76% 46%), hsl(142 76% 30%))",
            boxShadow: "inset 0 0 12px rgba(16,185,129,0.35)",
          }}
        />
        <motion.div
          initial={false}
          animate={{ width: `${breakdown.speedPct}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 22, mass: 0.5 }}
          className="h-full"
          style={{
            background: "linear-gradient(180deg, hsl(193 95% 62%), hsl(193 95% 42%))",
            boxShadow: "inset 0 0 12px rgba(6,182,212,0.35)",
          }}
        />
        <motion.div
          initial={false}
          animate={{ width: `${breakdown.severityPct}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 22, mass: 0.5 }}
          className="h-full"
          style={{
            background: "linear-gradient(180deg, hsl(292 84% 65%), hsl(292 84% 40%))",
            boxShadow: "inset 0 0 12px rgba(217,70,239,0.35)",
          }}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.12), transparent 40%, rgba(0,0,0,0.18))",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-between px-2.5">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-white/70 [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
          Pace
        </span>
        <span className="font-mono text-base font-black tabular-nums text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
          {breakdown.score.toFixed(1)}
        </span>
      </div>
    </div>
  );
};

const SEV_STYLES = {
  critical: "bg-critical/20 text-critical border-critical/40",
  high: "bg-high/20 text-high border-high/40",
  medium: "bg-medium/20 text-medium border-medium/40",
} as const;

const SEV_LABEL: Record<keyof typeof SEV_STYLES, string> = {
  critical: "C",
  high: "H",
  medium: "M",
};

const SevChip = ({
  sev,
  count,
}: {
  sev: keyof typeof SEV_STYLES;
  count: number;
}) => (
  <div
    className={cn(
      "flex h-4 min-w-[28px] items-center justify-center gap-0.5 rounded-sm border px-1 font-mono text-[9px] font-black tabular-nums leading-none",
      SEV_STYLES[sev],
      count === 0 && "opacity-40",
    )}
    title={`${sev} incidents`}
  >
    <span>{SEV_LABEL[sev]}</span>
    <span>{count}</span>
  </div>
);

export { GRID_COLS };
export default RaceRow;
