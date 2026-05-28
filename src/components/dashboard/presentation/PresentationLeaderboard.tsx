import { motion } from "framer-motion";
import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { useIncidents } from "@/context/useIncidents";

interface ResponderRow {
  name: string;
  total: number;
  responded: number;
  critical: number;
  responseRate: number;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const tierColor = (rate: number) => {
  if (rate >= 80) return "text-emerald-300";
  if (rate >= 60) return "text-amber-300";
  if (rate > 0) return "text-orange-400";
  return "text-rose-400";
};

const tierBar = (rate: number) => {
  if (rate >= 80) return "from-emerald-500/80 to-emerald-300";
  if (rate >= 60) return "from-amber-500/80 to-amber-300";
  if (rate > 0) return "from-orange-500/80 to-orange-300";
  return "from-rose-500/80 to-rose-300";
};

const rankChipClass = (rank: number) => {
  if (rank === 1)
    return "bg-gradient-to-br from-yellow-300 to-yellow-600 text-black shadow-[0_0_14px_hsl(45_93%_47%/0.6)]";
  if (rank === 2)
    return "bg-gradient-to-br from-slate-100 to-slate-400 text-black";
  if (rank === 3)
    return "bg-gradient-to-br from-amber-500 to-amber-800 text-black";
  return "bg-secondary/70 text-foreground border border-border/60";
};

interface Props {
  reduceMotion: boolean;
}

const PresentationLeaderboard = ({ reduceMotion }: Props) => {
  const { incidents } = useIncidents();

  const leaderboard = useMemo<ResponderRow[]>(() => {
    const stats: Record<string, ResponderRow> = {};
    incidents.forEach((i) => {
      const name = i.responder || "Unassigned";
      if (!stats[name])
        stats[name] = { name, total: 0, responded: 0, critical: 0, responseRate: 0 };
      stats[name].total += 1;
      if (i.responseStatus === "responded") stats[name].responded += 1;
      if (i.severity === "critical") stats[name].critical += 1;
    });
    return Object.values(stats)
      .filter((r) => r.name !== "Unassigned")
      .map((r) => ({
        ...r,
        responseRate: r.total > 0 ? Math.round((r.responded / r.total) * 100) : 0,
      }))
      .sort((a, b) => (b.responseRate !== a.responseRate ? b.responseRate - a.responseRate : b.total - a.total))
      .slice(0, 6);
  }, [incidents]);

  const totalResp = leaderboard.reduce((acc, r) => acc + r.responded, 0);
  const totalCases = leaderboard.reduce((acc, r) => acc + r.total, 0);
  const avgRate =
    leaderboard.length > 0
      ? Math.round(leaderboard.reduce((acc, r) => acc + r.responseRate, 0) / leaderboard.length)
      : 0;

  return (
    <div className="p-4 pt-3">
      {/* Header strip */}
      <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/40 px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Top Responders</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
          <Mini label="Avg" value={`${avgRate}%`} accent="text-emerald-300" />
          <Mini label="Resp" value={totalResp.toLocaleString()} accent="text-primary" />
          <Mini label="Cases" value={totalCases.toLocaleString()} accent="text-foreground" />
        </div>
      </div>

      {/* Rows */}
      {leaderboard.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          No responder data yet.
        </div>
      ) : (
        <div className="space-y-1.5">
          {leaderboard.map((r, i) => (
            <motion.div
              key={r.name}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: reduceMotion ? 0 : 0.04 * i,
                type: "spring",
                stiffness: 380,
                damping: 32,
                mass: 0.7,
              }}
              className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-card/40 px-2.5 py-1.5 backdrop-blur-sm"
            >
              <div
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded font-mono text-[11px] font-black tabular-nums ${rankChipClass(
                  i + 1,
                )}`}
              >
                {(i + 1).toString().padStart(2, "0")}
              </div>
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border/60 bg-secondary text-[10px] font-semibold text-foreground">
                {getInitials(r.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-foreground">{r.name}</div>
                <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  <span className="tabular-nums text-foreground/80">{r.total}</span>total
                  <span className="text-foreground/30">·</span>
                  <span className="tabular-nums text-foreground/80">{r.responded}</span>resp
                  {r.critical > 0 && (
                    <>
                      <span className="text-foreground/30">·</span>
                      <span className="tabular-nums text-rose-400">{r.critical}</span>crit
                    </>
                  )}
                </div>
              </div>
              <div className="flex w-24 flex-shrink-0 items-center gap-1.5">
                <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-foreground/10">
                  <motion.div
                    initial={reduceMotion ? { width: `${r.responseRate}%` } : { width: 0 }}
                    animate={{ width: `${r.responseRate}%` }}
                    transition={{
                      delay: reduceMotion ? 0 : 0.04 * i + 0.1,
                      type: "spring",
                      stiffness: 140,
                      damping: 22,
                    }}
                    className={`h-full rounded-full bg-gradient-to-r ${tierBar(r.responseRate)}`}
                  />
                </div>
                <div className={`w-9 text-right font-mono text-sm font-bold tabular-nums ${tierColor(r.responseRate)}`}>
                  {r.responseRate}%
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const Mini = ({ label, value, accent }: { label: string; value: string; accent: string }) => (
  <span className="inline-flex items-baseline gap-1">
    <span className="text-muted-foreground/80">{label}</span>
    <span className={`text-xs tabular-nums ${accent}`}>{value}</span>
  </span>
);

export default PresentationLeaderboard;
