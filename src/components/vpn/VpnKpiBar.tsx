import { Card, CardContent } from "@/components/ui/card";
import { Activity, ShieldCheck, ShieldAlert, Users } from "lucide-react";
import { useMemo } from "react";
import type { VpnAccessRecord } from "@/types/vpn";

const KpiCard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) => (
  <div className="p-px rounded-xl bg-gradient-to-br from-primary/20 via-border/20 to-transparent">
    <Card className="bg-gradient-card border-0 rounded-xl transition-all duration-300 hover:shadow-glow hover:scale-[1.01]">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80 mb-1">{label}</p>
            <p className={`text-3xl font-bold font-numeric ${accent || "text-foreground"}`}>{value}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center">
            <Icon className={`w-5 h-5 ${accent || "text-primary"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const VpnKpiBar = ({ records }: { records: VpnAccessRecord[] }) => {
  const { total, success, failure, uniqueUsers } = useMemo(() => {
    let success = 0;
    let failure = 0;
    const users = new Set<string>();
    records.forEach((r) => {
      if (r.outcome === "success") success += 1;
      else if (r.outcome === "failure") failure += 1;
      if (r.cleanUser) users.add(r.cleanUser.toLowerCase());
    });
    return { total: records.length, success, failure, uniqueUsers: users.size };
  }, [records]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <KpiCard icon={Activity} label="Total Connections" value={total.toLocaleString()} />
      <KpiCard icon={ShieldCheck} label="Successful Tunnels" value={success.toLocaleString()} accent="text-success" />
      <KpiCard icon={ShieldAlert} label="Failed Logins" value={failure.toLocaleString()} accent="text-critical" />
      <KpiCard icon={Users} label="Unique Users" value={uniqueUsers.toLocaleString()} />
    </div>
  );
};

export default VpnKpiBar;
