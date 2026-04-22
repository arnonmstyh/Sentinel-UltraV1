import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIncidents } from "@/context/useIncidents";
import {
  buildLeaderboardFromIncidents,
  type RaceResponder,
} from "@/lib/raceMetrics";
import { usePreviousRanks } from "@/lib/usePreviousRanks";
import RaceHeader from "@/components/race/RaceHeader";
import RaceRow, { GRID_COLS } from "@/components/race/RaceRow";
import RaceTrackMap from "@/components/race/RaceTrackMap";
import RaceMiniLeaderboard from "@/components/race/RaceMiniLeaderboard";
import ResponderDetailDialog from "@/components/race/ResponderDetailDialog";

const ResponderLiveRace = () => {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  // Pin session start at mount — do NOT let it re-read Date.now() every render,
  // otherwise the session clock stays glued to 00:00.
  const [sessionStart] = useState(() => Date.now());
  const { incidents, loading, error } = useIncidents();

  const rows: RaceResponder[] = useMemo(
    () => buildLeaderboardFromIncidents(incidents),
    [incidents],
  );

  const previousRanks = usePreviousRanks(rows);

  const leaderScore = rows[0]?.score ?? 0;
  const fastestLapMs = rows.reduce(
    (fastest, r) =>
      r.bestResponseMs > 0 && (fastest === 0 || r.bestResponseMs < fastest)
        ? r.bestResponseMs
        : fastest,
    0,
  );
  const totalIncidents = rows.reduce((a, r) => a + r.totalIncidents, 0);
  const totalResolved = rows.reduce((a, r) => a + r.resolved, 0);

  return (
    <div className="min-h-full space-y-4 p-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <div className="h-6 w-px bg-border" />
          <h1 className="font-mono text-sm font-black uppercase tracking-[0.32em] text-foreground">
            Responder · Live Race
          </h1>
          <span className="rounded-full border border-success/40 bg-success/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-success">
            Live Data
          </span>
        </div>
      </div>

      <RaceHeader
        sessionStart={sessionStart}
        responderCount={rows.length}
        totalIncidents={totalIncidents}
        totalResolved={totalResolved}
      />

      {rows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <RaceTrackMap responders={rows} />
          <RaceMiniLeaderboard responders={rows} fastestLapMs={fastestLapMs} />
        </div>
      )}

      <div
        className={`grid items-center gap-3 rounded-md border border-border/40 bg-[hsl(220_20%_5%)] px-2 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground ${GRID_COLS}`}
      >
        <span className="text-center">Pos</span>
        <span />
        <span>Driver</span>
        <span>Gap</span>
        <span className="text-emerald-400/80">Resolved</span>
        <span className="text-cyan-400/80">Response</span>
        <span className="text-fuchsia-400/80">Severity</span>
        <span>Pace · Score</span>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-20 text-muted-foreground">
          <Info className="h-6 w-6" />
          <p className="font-mono text-xs uppercase tracking-widest">
            {loading
              ? "Loading incident data…"
              : error
                ? error
                : "No responders with assignments yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {rows.map((r, i) => (
              <RaceRow
                key={r.name}
                responder={r}
                rank={i + 1}
                previousRank={previousRanks.get(r.name)}
                leaderScore={leaderScore}
                fastestLapMs={fastestLapMs}
                onSelect={(resp) => setSelectedName(resp.name)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <ResponderDetailDialog
        responder={rows.find((r) => r.name === selectedName) ?? null}
        rank={
          selectedName
            ? rows.findIndex((r) => r.name === selectedName) + 1
            : 0
        }
        fastestLapMs={fastestLapMs}
        fieldSize={rows.length}
        onClose={() => setSelectedName(null)}
      />

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border/40 pt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <div>
          Score = <span className="text-emerald-400">0.40 × Resolved</span> +{" "}
          <span className="text-cyan-400">0.30 × Speed</span> +{" "}
          <span className="text-fuchsia-400">0.30 × Severity</span>
          <span className="ml-2 text-muted-foreground/70">(each normalized 0–1 vs field max)</span>
        </div>
        <div className="flex items-center gap-4">
          <Legend color="bg-emerald-500" label="Resolved Contribution" />
          <Legend color="bg-cyan-400" label="Speed Contribution" />
          <Legend color="bg-fuchsia-500" label="Severity Contribution" />
        </div>
      </footer>
    </div>
  );
};

const Legend = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-1.5">
    <span className={`h-2 w-4 rounded-sm ${color}`} />
    <span>{label}</span>
  </div>
);

export default ResponderLiveRace;
