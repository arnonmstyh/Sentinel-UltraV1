import { useEffect, useState } from "react";
import { Flag, Activity, Users } from "lucide-react";
import { formatSessionClock } from "@/lib/raceMetrics";

interface RaceHeaderProps {
  sessionStart: number;
  responderCount: number;
  totalIncidents: number;
  totalResolved: number;
  mode: "mock" | "live";
}

const RaceHeader = ({
  sessionStart,
  responderCount,
  totalIncidents,
  totalResolved,
  mode,
}: RaceHeaderProps) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = Math.max(0, now - sessionStart);

  return (
    <div className="relative overflow-hidden rounded-lg border border-border/60 bg-gradient-to-br from-[hsl(220_26%_10%)] via-[hsl(220_26%_6%)] to-[hsl(220_26%_3%)] px-6 py-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0 2px, rgba(255,255,255,0.8) 2px 3px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, hsl(193 95% 55% / 0.22), transparent)" }}
      />

      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_theme(colors.red.500)]" />
            </span>
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-red-500">
              Live
            </span>
          </div>
          <div className="h-8 w-px bg-border/60" />
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              SOC Response Arena
            </div>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-3xl font-black tabular-nums text-primary [text-shadow:0_0_16px_hsl(193_95%_55%_/_0.45)]">
                {formatSessionClock(elapsed)}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Session Time
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Stat icon={<Users className="h-3.5 w-3.5" />} label="Drivers" value={responderCount} />
          <Stat icon={<Flag className="h-3.5 w-3.5" />} label="Incidents" value={totalIncidents} />
          <Stat icon={<Activity className="h-3.5 w-3.5" />} label="Resolved" value={totalResolved} accent />
          <div className="rounded-md border border-border/70 bg-black/50 px-3 py-1.5">
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              Mode
            </div>
            <div
              className={`font-mono text-xs font-bold ${
                mode === "live" ? "text-success" : "text-primary"
              }`}
            >
              {mode === "live" ? "LIVE DATA" : "DEMO LAP"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat = ({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) => (
  <div className="flex flex-col items-end gap-0.5">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      {icon}
      <span className="font-mono text-[9px] uppercase tracking-[0.22em]">{label}</span>
    </div>
    <span
      className={`font-mono text-xl font-black tabular-nums ${
        accent ? "text-success" : "text-foreground"
      }`}
    >
      {value}
    </span>
  </div>
);

export default RaceHeader;
