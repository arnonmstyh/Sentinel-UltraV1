import { motion } from "framer-motion";
import { ShieldAlert, ShieldX, Activity, Crosshair, AlertOctagon } from "lucide-react";
import { useMemo } from "react";
import { useVpnUsage } from "@/context/useVpnUsage";
import type { VpnAccessRecord } from "@/types/vpn";

const BRUTE_FORCE_WINDOW_MS = 10 * 60 * 1000;
const BURST_THRESHOLD = 5;

interface BruteForceEntry {
  srcIp: string;
  attempts: number;
  users: string[];
  burst: number;
  credentialJunk: boolean;
}

interface Props {
  reduceMotion: boolean;
}

const PresentationVpnThreats = ({ reduceMotion }: Props) => {
  const { records } = useVpnUsage();

  const { failures, failureRate, junkCount, offendingIps, bruteForce, suspectIpCount } = useMemo(() => {
    const total = records.length;
    const failRecords = records.filter((r) => r.outcome === "failure");
    const failures = failRecords.length;
    const failureRate = total > 0 ? Math.round((failures / total) * 100) : 0;
    const junkCount = records.filter((r) => r.isBruteForce).length;

    const bySrc: Record<string, VpnAccessRecord[]> = {};
    failRecords.forEach((r) => {
      const ip = r.srcIp || "unknown";
      (bySrc[ip] = bySrc[ip] || []).push(r);
    });

    const offendingIps = Object.entries(bySrc)
      .map(([ip, recs]) => ({ ip, count: recs.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

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

    return {
      failures,
      failureRate,
      junkCount,
      offendingIps,
      bruteForce: bruteForce.slice(0, 3),
      suspectIpCount: bruteForce.length,
    };
  }, [records]);

  const maxIpCount = offendingIps[0]?.count || 1;

  return (
    <div className="p-4 pt-3">
      {/* Hero tiles */}
      <div className="grid grid-cols-3 gap-2">
        <Hero icon={<ShieldX className="h-3.5 w-3.5" />} label="Failed Logins" value={failures.toLocaleString()} accent="text-rose-300" ring="border-rose-400/30" delay={0} reduceMotion={reduceMotion} />
        <Hero icon={<Activity className="h-3.5 w-3.5" />} label="Failure Rate" value={`${failureRate}%`} accent="text-amber-300" ring="border-amber-400/30" delay={0.05} reduceMotion={reduceMotion} />
        <Hero icon={<Crosshair className="h-3.5 w-3.5" />} label="Cred Junk" value={junkCount.toLocaleString()} accent="text-rose-300" ring="border-rose-400/30" delay={0.1} reduceMotion={reduceMotion} />
      </div>

      {/* Top offenders */}
      <div className="mt-3 rounded-lg border border-border/50 bg-card/40 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 border-b border-border/40 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
          <ShieldX className="h-3 w-3 text-rose-400" />
          Top Offending IPs
        </div>
        <div className="divide-y divide-border/30">
          {offendingIps.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-muted-foreground">No failed logins recorded.</p>
          ) : (
            offendingIps.map((o, i) => (
              <motion.div
                key={o.ip}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reduceMotion ? 0 : 0.05 * i + 0.1, type: "spring", stiffness: 300, damping: 28 }}
                className="flex items-center gap-2 px-3 py-1.5"
              >
                <span className="w-32 truncate font-mono text-[11px] text-foreground">{o.ip}</span>
                <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-foreground/10">
                  <motion.div
                    initial={reduceMotion ? { width: `${(o.count / maxIpCount) * 100}%` } : { width: 0 }}
                    animate={{ width: `${(o.count / maxIpCount) * 100}%` }}
                    transition={{
                      delay: reduceMotion ? 0 : 0.05 * i + 0.18,
                      type: "spring",
                      stiffness: 140,
                      damping: 22,
                    }}
                    className="h-full rounded-full bg-gradient-to-r from-rose-500/80 to-rose-300"
                  />
                </div>
                <span className="w-10 text-right font-mono text-xs font-bold tabular-nums text-rose-300">
                  {o.count.toLocaleString()}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Brute-force list */}
      <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/[0.05] backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-rose-400/30 px-3 py-1.5">
          <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.28em] text-rose-300/80">
            <AlertOctagon className="h-3 w-3 text-rose-300" />
            Suspected Brute-Force
          </div>
          <span className="font-mono text-[10px] tabular-nums text-rose-300">{suspectIpCount} suspect{suspectIpCount === 1 ? "" : "s"}</span>
        </div>
        <div className="space-y-1.5 p-2">
          {bruteForce.length === 0 ? (
            <p className="px-1 py-1 text-[11px] text-muted-foreground">No brute-force activity detected.</p>
          ) : (
            bruteForce.map((b, i) => (
              <motion.div
                key={b.srcIp}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reduceMotion ? 0 : 0.05 * i, type: "spring", stiffness: 300, damping: 28 }}
                className="rounded-md border border-rose-400/30 bg-rose-500/[0.05] px-2.5 py-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[11px] text-foreground">{b.srcIp}</span>
                  <span className="whitespace-nowrap font-mono text-xs font-bold tabular-nums text-rose-300">
                    {b.attempts.toLocaleString()}
                    <span className="ml-1 text-[9px] uppercase tracking-widest text-rose-300/70">att</span>
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <Tag>{b.users.length}u</Tag>
                  {b.burst >= BURST_THRESHOLD && <Tag tone="amber">{b.burst}/10m</Tag>}
                  {b.credentialJunk && <Tag tone="rose">cred in user</Tag>}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const Hero = ({
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
  accent: string;
  ring: string;
  delay: number;
  reduceMotion: boolean;
}) => (
  <motion.div
    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: reduceMotion ? 0 : delay, type: "spring", stiffness: 240, damping: 26 }}
    className={`rounded-lg border bg-card/50 px-3 py-2 backdrop-blur-sm ${ring}`}
  >
    <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className={`mt-0.5 font-mono text-xl font-bold tabular-nums ${accent}`}>{value}</div>
  </motion.div>
);

const Tag = ({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "amber" | "rose" }) => {
  const cls =
    tone === "amber"
      ? "bg-amber-500/15 text-amber-300 border-amber-400/30"
      : tone === "rose"
      ? "bg-rose-500/15 text-rose-300 border-rose-400/30"
      : "bg-secondary/70 text-muted-foreground border-border/60";
  return (
    <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${cls}`}>
      {children}
    </span>
  );
};

export default PresentationVpnThreats;
