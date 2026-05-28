import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMemo, useState } from "react";
import type { VpnAccessRecord } from "@/types/vpn";

type RangeValue = "1d" | "7d" | "30d" | "all";

const RANGES: { value: RangeValue; label: string }[] = [
  { value: "1d", label: "1 Day" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "all", label: "All Time" },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// Timestamps are stored as UTC wall-clock — read with UTC getters so the
// bucket a connection belongs to never drifts with the viewer's timezone.
const dayKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

const hourKey = (d: Date) => `${dayKey(d)}-${String(d.getUTCHours()).padStart(2, "0")}`;

const ConnectionsOverTime = ({ records }: { records: VpnAccessRecord[] }) => {
  const [range, setRange] = useState<RangeValue>("all");

  const data = useMemo(() => {
    const dates = records
      .map((r) => r.timestamp)
      .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()));
    if (dates.length === 0) return [];

    const minMs = Math.min(...dates.map((d) => d.getTime()));
    const maxMs = Math.max(...dates.map((d) => d.getTime()));

    const buckets: Record<string, { success: number; failure: number }> = {};
    const order: { key: string; label: string }[] = [];

    if (range === "1d") {
      // 24 contiguous hourly buckets ending at the hour of the latest record
      const hourFloor = new Date(maxMs);
      hourFloor.setUTCMinutes(0, 0, 0);
      for (let i = 23; i >= 0; i--) {
        const slot = new Date(hourFloor.getTime() - i * HOUR_MS);
        const key = hourKey(slot);
        order.push({ key, label: `${String(slot.getUTCHours()).padStart(2, "0")}:00` });
        buckets[key] = { success: 0, failure: 0 };
      }
      records.forEach((r) => {
        if (!(r.timestamp instanceof Date) || isNaN(r.timestamp.getTime())) return;
        const k = hourKey(r.timestamp);
        if (!buckets[k]) return;
        if (r.outcome === "success") buckets[k].success += 1;
        else if (r.outcome === "failure") buckets[k].failure += 1;
      });
    } else {
      // Daily buckets — contiguous from the start day to the day of the latest record
      const endDay = new Date(maxMs);
      endDay.setUTCHours(0, 0, 0, 0);
      const minDay = new Date(minMs);
      minDay.setUTCHours(0, 0, 0, 0);

      let windowStart = minDay.getTime();
      if (range === "7d") windowStart = endDay.getTime() - 6 * DAY_MS;
      else if (range === "30d") windowStart = endDay.getTime() - 29 * DAY_MS;

      // Never start before the first record
      const cursor = new Date(Math.max(windowStart, minDay.getTime()));
      while (cursor.getTime() <= endDay.getTime()) {
        const key = dayKey(cursor);
        const [, m, d] = key.split("-");
        order.push({ key, label: `${m}/${d}` });
        buckets[key] = { success: 0, failure: 0 };
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      records.forEach((r) => {
        if (!(r.timestamp instanceof Date) || isNaN(r.timestamp.getTime())) return;
        const k = dayKey(r.timestamp);
        if (!buckets[k]) return;
        if (r.outcome === "success") buckets[k].success += 1;
        else if (r.outcome === "failure") buckets[k].failure += 1;
      });
    }

    return order.map(({ key, label }) => ({
      name: label,
      success: buckets[key].success,
      failure: buckets[key].failure,
    }));
  }, [records, range]);

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Connections Over Time
          </CardTitle>
          <div className="flex items-center gap-1 bg-card border border-border rounded-md p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  range === r.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">No connection data</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <defs>
                <linearGradient id="vpnSuccessGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(193, 95%, 55%)" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="hsl(193, 95%, 55%)" stopOpacity={0.35} />
                </linearGradient>
                <linearGradient id="vpnFailureGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 17%, 16%)" strokeOpacity={0.5} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} interval="preserveStartEnd" />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
                labelStyle={{ color: "hsl(210 40% 98%)", fontWeight: 600 }}
                itemStyle={{ color: "hsl(215 20.2% 65.1%)" }}
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.15 }}
              />
              <Legend />
              <Bar dataKey="success" stackId="c" fill="url(#vpnSuccessGradient)" name="Established" radius={[0, 0, 0, 0]} />
              <Bar dataKey="failure" stackId="c" fill="url(#vpnFailureGradient)" name="Denied" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionsOverTime;
