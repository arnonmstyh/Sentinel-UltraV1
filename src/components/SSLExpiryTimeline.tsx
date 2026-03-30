import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface UrlData {
  id: number;
  url: string;
  issuer: string | null;
  validFrom: string | null;
  expiryDate: string | null;
  daysRemaining: number | null;
  status: "GOOD" | "WARNING" | "EXPIRED" | "ERROR" | "PENDING";
  lastChecked: string;
  lastError?: string | null;
  starred?: boolean;
}

interface SSLExpiryTimelineProps {
  urls: UrlData[];
}

const COLOR_GREEN = "#22c55e";
const COLOR_YELLOW = "#f59e0b";
const COLOR_RED = "#ef4444";
const COLOR_GRAY = "#6b7280";

function getBarColor(daysRemaining: number | null): string {
  if (daysRemaining === null || daysRemaining <= 0) return COLOR_GRAY;
  if (daysRemaining < 7) return COLOR_RED;
  if (daysRemaining <= 30) return COLOR_YELLOW;
  return COLOR_GREEN;
}

function extractHostname(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

const SSLExpiryTimeline = ({ urls }: SSLExpiryTimelineProps) => {
  const chartData = useMemo(() => {
    const sorted = [...urls].sort((a, b) => {
      const aDays = a.daysRemaining ?? -1;
      const bDays = b.daysRemaining ?? -1;
      return aDays - bDays;
    });

    return sorted.slice(0, 15).map((item) => ({
      hostname: extractHostname(item.url),
      daysRemaining: item.daysRemaining !== null ? Math.max(0, item.daysRemaining) : 0,
      rawDays: item.daysRemaining,
      status: item.status,
      url: item.url,
    }));
  }, [urls]);

  const chartHeight = Math.max(250, chartData.length * 36 + 40);

  if (chartData.length === 0) {
    return (
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Clock className="w-5 h-5 text-primary" />
            Certificate Expiry Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-muted-foreground">No certificate data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Clock className="w-5 h-5 text-primary" />
          Certificate Expiry Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <XAxis
              type="number"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
              label={{
                value: "Days Remaining",
                position: "insideBottom",
                offset: -2,
                fill: "hsl(var(--muted-foreground))",
                fontSize: 12,
              }}
            />
            <YAxis
              type="category"
              dataKey="hostname"
              width={160}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--accent))", opacity: 0.15 }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                color: "hsl(var(--foreground))",
                fontSize: 13,
              }}
              formatter={(value: number, _name: string, props: { payload: { rawDays: number | null; url: string } }) => {
                const rawDays = props.payload.rawDays;
                const label =
                  rawDays === null
                    ? "No data"
                    : rawDays <= 0
                      ? "Expired"
                      : `${rawDays} days`;
                return [label, "Days Remaining"];
              }}
              labelFormatter={(label: string) => label}
            />
            <Bar dataKey="daysRemaining" radius={[0, 4, 4, 0]} barSize={20}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.rawDays)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: COLOR_GREEN }}
            />
            <span>&gt; 30 days</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: COLOR_YELLOW }}
            />
            <span>7 - 30 days</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: COLOR_RED }}
            />
            <span>&lt; 7 days</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: COLOR_GRAY }}
            />
            <span>Expired / Error</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SSLExpiryTimeline;
