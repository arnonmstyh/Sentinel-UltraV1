import { AnimatePresence, motion } from "framer-motion";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLapTime, type RaceResponder } from "@/lib/raceMetrics";

interface Props {
  responders: RaceResponder[];
  fastestLapMs: number;
}

const RaceMiniLeaderboard = ({ responders, fastestLapMs }: Props) => {
  return (
    <div className="flex h-full min-h-[300px] flex-col overflow-hidden rounded-lg border border-border/60 bg-gradient-to-br from-[hsl(220_26%_10%)] via-[hsl(220_26%_6%)] to-[hsl(220_26%_3%)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
            Ranking
          </span>
          <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-widest text-primary">
            Live
          </span>
        </div>
        <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-muted-foreground">
          Best Time
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-0.5">
        <AnimatePresence initial={false} mode="popLayout">
          {responders.map((r, i) => {
            const isLeader = i === 0;
            const holdsFastest =
              r.bestResponseMs > 0 && r.bestResponseMs === fastestLapMs;
            return (
              <motion.div
                key={r.name}
                layout
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{
                  layout: { type: "spring", stiffness: 420, damping: 36, mass: 0.7 },
                  opacity: { duration: 0.2 },
                }}
                className="mb-1 last:mb-0"
              >
                <div className="grid grid-cols-[26px_4px_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border/40 bg-[hsl(220_20%_7%)] px-2 py-1.5 transition-colors hover:border-border/70">
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded font-mono text-xs font-black tabular-nums",
                      i === 0 &&
                        "bg-gradient-to-br from-yellow-300 to-yellow-600 text-black shadow-[0_0_10px_hsl(45_93%_47%/0.5)]",
                      i === 1 && "bg-gradient-to-br from-slate-200 to-slate-400 text-black",
                      i === 2 && "bg-gradient-to-br from-amber-500 to-amber-800 text-black",
                      i > 2 && "border border-border/60 bg-secondary/80 text-foreground",
                    )}
                  >
                    {i + 1}
                  </div>

                  <div
                    aria-hidden
                    className="h-6 w-1 rounded-sm"
                    style={{
                      backgroundColor: r.teamColor,
                      boxShadow: `0 0 6px ${r.teamColor}70`,
                    }}
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span
                        className="rounded px-1 py-[1px] font-mono text-[10px] font-black tracking-wider text-white"
                        style={{ backgroundColor: r.teamColor }}
                      >
                        {r.code}
                      </span>
                      {holdsFastest && (
                        <Zap
                          className="h-2.5 w-2.5 text-purple-300"
                          fill="currentColor"
                          strokeWidth={0}
                        />
                      )}
                    </div>
                    <div className="truncate text-[10px] leading-tight text-muted-foreground">
                      {r.name}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "font-mono text-[11px] font-black tabular-nums",
                      holdsFastest
                        ? "text-purple-300 [text-shadow:0_0_6px_rgba(168,85,247,0.5)]"
                        : isLeader
                          ? "text-primary"
                          : "text-foreground/90",
                    )}
                  >
                    {formatLapTime(r.bestResponseMs)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RaceMiniLeaderboard;
