import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useMemo } from "react";
import type { VpnAccessRecord } from "@/types/vpn";

interface UserStat {
  name: string;
  total: number;
  success: number;
  failure: number;
}

const initials = (name: string) =>
  name.replace(/[^a-zA-Z0-9]/g, " ").trim().split(/\s+/).map((p) => p[0]).join("").toUpperCase().slice(0, 2) || "?";

const TopUsers = ({ records }: { records: VpnAccessRecord[] }) => {
  const users = useMemo(() => {
    const map: Record<string, UserStat> = {};
    records.forEach((r) => {
      const name = r.cleanUser || "unknown";
      if (!map[name]) map[name] = { name, total: 0, success: 0, failure: 0 };
      map[name].total += 1;
      if (r.outcome === "success") map[name].success += 1;
      else if (r.outcome === "failure") map[name].failure += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [records]);

  const max = users[0]?.total || 1;

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Top Users
        </CardTitle>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No user data</div>
        ) : (
          <div className="space-y-3">
            {users.map((u, index) => (
              <div key={u.name} className="flex items-center gap-3">
                <span className="w-5 text-xs font-bold text-muted-foreground text-center tabular-nums">{index + 1}</span>
                <div className="w-8 h-8 rounded-full flex-shrink-0 bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center text-xs font-bold text-primary">
                  {initials(u.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{u.name}</span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">{u.total}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                      style={{ width: `${(u.total / max) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="text-emerald-400">{u.success} ok</span>
                    {u.failure > 0 && <span className="text-red-400">{u.failure} failed</span>}
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

export default TopUsers;
