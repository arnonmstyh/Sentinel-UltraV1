import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe } from "lucide-react";
import { useMemo } from "react";
import type { VpnAccessRecord } from "@/types/vpn";

interface IpStat {
  ip: string;
  total: number;
  success: number;
  failure: number;
}

const TopSourceIps = ({ records }: { records: VpnAccessRecord[] }) => {
  const ips = useMemo(() => {
    const map: Record<string, IpStat> = {};
    records.forEach((r) => {
      const ip = r.srcIp || "unknown";
      if (!map[ip]) map[ip] = { ip, total: 0, success: 0, failure: 0 };
      map[ip].total += 1;
      if (r.outcome === "success") map[ip].success += 1;
      else if (r.outcome === "failure") map[ip].failure += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [records]);

  const max = ips[0]?.total || 1;

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Top Source IPs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ips.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No source IP data</div>
        ) : (
          <div className="space-y-3">
            {ips.map((s, index) => (
              <div key={s.ip} className="flex items-center gap-3">
                <span className="w-5 text-xs font-bold text-muted-foreground text-center tabular-nums">{index + 1}</span>
                <div className="w-8 h-8 rounded-lg flex-shrink-0 bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
                  <Globe className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-mono text-foreground truncate">{s.ip}</span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">{s.total}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                      style={{ width: `${(s.total / max) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="text-emerald-400">{s.success} ok</span>
                    {s.failure > 0 && <span className="text-red-400">{s.failure} failed</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopSourceIps;
