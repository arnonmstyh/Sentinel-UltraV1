import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Globe, Crosshair, ShieldAlert } from "lucide-react";
import { useIncidents } from "@/context/useIncidents";

const prettyType = (t: string) =>
  (t || "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || "Unknown";

interface Props {
  reduceMotion: boolean;
}

const PresentationExecSummary = ({ reduceMotion }: Props) => {
  const { incidents, loading } = useIncidents();

  const { total, countryCount, typeCount, criticalCount, topCountries, topTypes } = useMemo(() => {
    const countryMap: Record<string, number> = {};
    const typeMap: Record<string, number> = {};
    let critical = 0;
    incidents.forEach((i) => {
      const country = (i.country || "").trim() || "Unknown";
      countryMap[country] = (countryMap[country] || 0) + 1;
      const type = (i.type || "").trim() || "other";
      typeMap[type] = (typeMap[type] || 0) + 1;
      if (i.severity === "critical") critical += 1;
    });

    const topCountries = Object.entries(countryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const topTypes = Object.entries(typeMap)
      .map(([name, count]) => ({ name: prettyType(name), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: incidents.length,
      countryCount: Object.keys(countryMap).filter((c) => c !== "Unknown").length,
      typeCount: Object.keys(typeMap).length,
      criticalCount: critical,
      topCountries,
      topTypes,
    };
  }, [incidents]);

  if (loading && incidents.length === 0) {
    return <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (incidents.length === 0) {
    return <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">No incident data</div>;
  }

  return (
    <div className="p-4 pt-3">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-2.5">
        <Tile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Total" value={total.toLocaleString()} delay={0} reduceMotion={reduceMotion} />
        <Tile icon={<Globe className="h-3.5 w-3.5" />} label="Countries" value={countryCount.toLocaleString()} delay={0.04} reduceMotion={reduceMotion} />
        <Tile icon={<Crosshair className="h-3.5 w-3.5" />} label="Attack Types" value={typeCount.toLocaleString()} delay={0.08} reduceMotion={reduceMotion} />
        <Tile
          icon={<ShieldAlert className="h-3.5 w-3.5" />}
          label="Critical"
          value={criticalCount.toLocaleString()}
          accent="text-rose-400"
          ring="border-rose-400/30"
          delay={0.12}
          reduceMotion={reduceMotion}
        />
      </div>

      {/* Breakdowns */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Breakdown title="Top Countries" items={topCountries} reduceMotion={reduceMotion} />
        <Breakdown title="Top Attack Types" items={topTypes} reduceMotion={reduceMotion} />
      </div>
    </div>
  );
};

const Tile = ({
  icon,
  label,
  value,
  accent,
  ring,
  delay,
  reduceMotion,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
  ring?: string;
  delay: number;
  reduceMotion: boolean;
}) => (
  <motion.div
    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: reduceMotion ? 0 : delay, type: "spring", stiffness: 240, damping: 28 }}
    className={`rounded-lg border bg-card/40 px-3 py-2 backdrop-blur-sm ${ring || "border-border/60"}`}
  >
    <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className={`mt-0.5 font-mono text-xl font-bold tabular-nums ${accent || "text-foreground"}`}>{value}</div>
  </motion.div>
);

const Breakdown = ({
  title,
  items,
  reduceMotion,
}: {
  title: string;
  items: { name: string; count: number }[];
  reduceMotion: boolean;
}) => {
  const max = items[0]?.count || 1;
  return (
    <div>
      <h4 className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">{title}</h4>
      {items.length === 0 ? (
        <p className="py-1 text-[11px] text-muted-foreground">No data</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((it, idx) => (
            <motion.div
              key={it.name}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.05 * idx + 0.1, type: "spring", stiffness: 280, damping: 28 }}
              className="flex items-center gap-2"
            >
              <span className="w-3 text-[10px] font-bold tabular-nums text-muted-foreground">{idx + 1}</span>
              <span className="w-20 truncate text-[11px] text-foreground" title={it.name}>
                {it.name}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                  style={{ width: `${(it.count / max) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right font-mono text-[11px] font-semibold tabular-nums text-foreground">{it.count}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PresentationExecSummary;
