import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Globe, Crosshair, AlertTriangle, ShieldAlert } from "lucide-react";
import { useMemo } from "react";
import { useIncidents } from "@/context/useIncidents";

// Turn a slug like "tcp-scan" or "data_breach" into "Tcp Scan" / "Data Breach".
const prettyType = (t: string) =>
  (t || "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || "Unknown";

const Tile = ({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
  label: string;
  value: string | number;
  accent?: string;
}) => (
  <div className="rounded-lg border border-border/60 bg-card/40 p-3">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
    <div className={`text-2xl font-bold tabular-nums mt-1 ${accent || "text-foreground"}`}>{value}</div>
  </div>
);

const Breakdown = ({ title, items }: { title: string; items: { name: string; count: number }[] }) => {
  const max = items[0]?.count || 1;
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-2">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No data</p>
      ) : (
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={it.name} className="flex items-center gap-2">
              <span className="w-4 text-xs font-bold text-muted-foreground text-center tabular-nums">{idx + 1}</span>
              <span className="text-sm text-foreground w-32 truncate" title={it.name}>{it.name}</span>
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                  style={{ width: `${(it.count / max) * 100}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-foreground tabular-nums w-8 text-right">{it.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ExecutiveSummary = () => {
  const { incidents, loading } = useIncidents();

  const { total, countryCount, typeCount, criticalCount, topCountries, topTypes } = useMemo(() => {
    const countryMap: Record<string, number> = {};
    const typeMap: Record<string, number> = {};
    let criticalCount = 0;

    incidents.forEach((i) => {
      const country = (i.country || "").trim() || "Unknown";
      countryMap[country] = (countryMap[country] || 0) + 1;
      const type = (i.type || "").trim() || "other";
      typeMap[type] = (typeMap[type] || 0) + 1;
      if (i.severity === "critical") criticalCount += 1;
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
      // "Countries Affected" counts identifiable countries only
      countryCount: Object.keys(countryMap).filter((c) => c !== "Unknown").length,
      typeCount: Object.keys(typeMap).length,
      criticalCount,
      topCountries,
      topTypes,
    };
  }, [incidents]);

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          Executive Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && incidents.length === 0 ? (
          <div className="flex items-center justify-center h-[160px] text-muted-foreground">Loading...</div>
        ) : incidents.length === 0 ? (
          <div className="flex items-center justify-center h-[160px] text-muted-foreground">No incident data</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <Tile icon={AlertTriangle} label="Total Incidents" value={total.toLocaleString()} />
              <Tile icon={Globe} label="Countries Affected" value={countryCount.toLocaleString()} />
              <Tile icon={Crosshair} label="Attack Types" value={typeCount.toLocaleString()} />
              <Tile icon={ShieldAlert} label="Critical Incidents" value={criticalCount.toLocaleString()} accent="text-critical" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Breakdown title="Top Countries" items={topCountries} />
              <Breakdown title="Top Attack Types" items={topTypes} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ExecutiveSummary;
