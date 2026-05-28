import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, ShieldX, Activity, Crosshair } from "lucide-react";
import { useMemo } from "react";
import type { VpnAccessRecord } from "@/types/vpn";

const BRUTE_FORCE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const BURST_THRESHOLD = 5; // failures within the window

interface BruteForceEntry {
  srcIp: string;
  attempts: number;
  users: string[];
  burst: number;
  credentialJunk: boolean;
}

const ThreatWatch = ({ records }: { records: VpnAccessRecord[] }) => {
  const { failures, failureRate, junkCount, offendingIps, bruteForce } = useMemo(() => {
    const total = records.length;
    const failRecords = records.filter((r) => r.outcome === "failure");
    const failures = failRecords.length;
    const failureRate = total > 0 ? Math.round((failures / total) * 100) : 0;
    const junkCount = records.filter((r) => r.isBruteForce).length;

    // Failures grouped by source IP
    const bySrc: Record<string, VpnAccessRecord[]> = {};
    failRecords.forEach((r) => {
      const ip = r.srcIp || "unknown";
      (bySrc[ip] = bySrc[ip] || []).push(r);
    });

    const offendingIps = Object.entries(bySrc)
      .map(([ip, recs]) => ({ ip, count: recs.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Brute-force detection: credential junk OR a velocity burst
    const bruteForce: BruteForceEntry[] = [];
    Object.entries(bySrc).forEach(([srcIp, recs]) => {
      const credentialJunk = recs.some((r) => r.isBruteForce);

      const ts = recs
        .map((r) => r.timestamp)
        .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()))
        .map((d) => d.getTime())
        .sort((a, b) => a - b);

      let burst = 0;
      let s = 0;
      for (let i = 0; i < ts.length; i++) {
        while (ts[i] - ts[s] > BRUTE_FORCE_WINDOW_MS) s++;
        burst = Math.max(burst, i - s + 1);
      }

      if (credentialJunk || burst >= BURST_THRESHOLD) {
        const users = Array.from(new Set(recs.map((r) => r.cleanUser || "unknown")));
        bruteForce.push({ srcIp, attempts: recs.length, users, burst, credentialJunk });
      }
    });
    bruteForce.sort((a, b) => b.attempts - a.attempts);

    return { failures, failureRate, junkCount, offendingIps, bruteForce: bruteForce.slice(0, 6) };
  }, [records]);

  const maxIpCount = offendingIps[0]?.count || 1;

  return (
    <Card className="bg-gradient-card border-rose-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          Threat Watch
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary tiles */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-lg border border-border/60 bg-card/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
              <ShieldX className="w-3.5 h-3.5" /> Failed Logins
            </div>
            <div className="text-2xl font-bold text-rose-400 tabular-nums mt-1">{failures.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5" /> Failure Rate
            </div>
            <div className="text-2xl font-bold text-amber-400 tabular-nums mt-1">{failureRate}%</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
              <Crosshair className="w-3.5 h-3.5" /> Credential Junk
            </div>
            <div className="text-2xl font-bold text-rose-400 tabular-nums mt-1">{junkCount.toLocaleString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top offending IPs */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Top Offending IPs</h4>
            {offendingIps.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No failed logins recorded.</p>
            ) : (
              <div className="space-y-2">
                {offendingIps.map((o) => (
                  <div key={o.ip} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-foreground w-32 truncate">{o.ip}</span>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400"
                        style={{ width: `${(o.count / maxIpCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-rose-400 tabular-nums w-8 text-right">{o.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Suspected brute-force */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Suspected Brute-Force</h4>
            {bruteForce.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No brute-force activity detected.</p>
            ) : (
              <div className="space-y-2">
                {bruteForce.map((b) => (
                  <div key={b.srcIp} className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-foreground truncate">{b.srcIp}</span>
                      <span className="text-xs font-semibold text-rose-400 whitespace-nowrap">{b.attempts} attempts</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        {b.users.length} user{b.users.length !== 1 ? "s" : ""} tried
                      </span>
                      {b.burst >= BURST_THRESHOLD && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                          {b.burst} in 10 min
                        </span>
                      )}
                      {b.credentialJunk && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400">
                          credentials in username
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/70 mt-4 pt-3 border-t border-border/50">
          Heuristic detection — flags advisory only. A source IP is suspected when a failed login carries
          password-like text in the username, or {BURST_THRESHOLD}+ failures occur within 10 minutes.
        </p>
      </CardContent>
    </Card>
  );
};

export default ThreatWatch;
