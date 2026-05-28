import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { useMemo } from "react";
import type { VpnAccessRecord, VpnOutcome } from "@/types/vpn";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Timestamps are UTC wall-clock — format with UTC getters to preserve the
// original logged time regardless of the viewer's timezone.
const formatEventTime = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

const dotColor = (outcome: VpnOutcome) => {
  if (outcome === "success") return "bg-emerald-500";
  if (outcome === "failure") return "bg-red-500";
  return "bg-gray-500";
};

const VpnEventTimeline = ({ records }: { records: VpnAccessRecord[] }) => {
  const events = useMemo(() => {
    return [...records]
      .filter((r) => r.timestamp instanceof Date && !isNaN((r.timestamp as Date).getTime()))
      .sort((a, b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime())
      .slice(0, 10);
  }, [records]);

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Recent VPN Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No recent events</div>
        ) : (
          <div className="space-y-0">
            {events.map((e, idx) => (
              <div key={e.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${dotColor(e.outcome)} ring-2 ring-card`} />
                  {idx < events.length - 1 && <div className="w-0.5 flex-1 min-h-[2.5rem] bg-border mt-1" />}
                </div>
                <div className="flex-1 pb-4 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{e.cleanUser || "unknown"}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {e.timestamp ? formatEventTime(e.timestamp) : "—"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">{e.srcIp}</p>
                  <span
                    className={`text-xs font-medium ${
                      e.outcome === "success" ? "text-emerald-400" : e.outcome === "failure" ? "text-red-400" : "text-muted-foreground"
                    }`}
                  >
                    {e.status || e.outcome}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VpnEventTimeline;
