import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useIncidents } from "@/context/useIncidents";
import { useState } from "react";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const IncidentChart = () => {
  const { incidents } = useIncidents();
  const [range, setRange] = useState<"all" | "monthly" | "weekly">("weekly");

  const parseCustomDate = (dateStr: string | Date): Date => {
    if (dateStr instanceof Date) return dateStr;
    const str = dateStr.toString();
    const match = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{1,2}):(\d{1,2})/);
    if (match) {
      const [, day, month, year, hour, minute, second] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Parse all incident dates once
  const parsedIncidents = incidents.map(inc => {
    const d = inc.createdAt instanceof Date ? inc.createdAt : new Date(inc.createdAt as any);
    return { ...inc, _date: isNaN(d.getTime()) ? null : d };
  }).filter(i => i._date !== null) as Array<typeof incidents[0] & { _date: Date }>;

  const sortedDates = parsedIncidents.map(i => i._date.getTime()).sort((a, b) => a - b);
  const maxDate = sortedDates.length > 0 ? new Date(sortedDates[sortedDates.length - 1]) : new Date();
  const minDate = sortedDates.length > 0 ? new Date(sortedDates[0]) : new Date();

  let data: Array<{ name: string; detected: number; resolved: number }> = [];

  if (range === "all") {
    // Group by month — show every month from earliest to latest incident
    const startMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    const monthKeys: string[] = [];
    const buckets: Record<string, { detected: number; resolved: number }> = {};

    const cursor = new Date(startMonth);
    while (cursor <= endMonth) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      monthKeys.push(key);
      buckets[key] = { detected: 0, resolved: 0 };
      cursor.setMonth(cursor.getMonth() + 1);
    }

    parsedIncidents.forEach(inc => {
      const key = `${inc._date.getFullYear()}-${String(inc._date.getMonth() + 1).padStart(2, "0")}`;
      if (buckets[key]) {
        buckets[key].detected += 1;
        if (inc.responseStatus === "responded") buckets[key].resolved += 1;
      }
    });

    data = monthKeys.map(key => {
      const [y, m] = key.split("-");
      return {
        name: `${MONTH_NAMES[parseInt(m) - 1]} ${y.slice(2)}`,
        detected: buckets[key].detected,
        resolved: buckets[key].resolved,
      };
    });
  } else {
    // Daily view: 7D or 30D
    const days = range === "weekly" ? 7 : 30;
    const startDate = new Date(maxDate);
    startDate.setDate(maxDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const dayKeys: string[] = [];
    const buckets: Record<string, { detected: number; resolved: number }> = {};

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      dayKeys.push(key);
      buckets[key] = { detected: 0, resolved: 0 };
    }

    parsedIncidents.forEach(inc => {
      const d = inc._date;
      if (d < startDate) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (buckets[key]) {
        buckets[key].detected += 1;
        if (inc.responseStatus === "responded") buckets[key].resolved += 1;
      }
    });

    data = dayKeys.map(key => {
      const parts = key.split("-");
      return {
        name: `${parts[1]}/${parts[2]}`,
        detected: buckets[key].detected,
        resolved: buckets[key].resolved,
      };
    });
  }

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="w-4 h-4 text-primary" />
            {range === "weekly" ? "Weekly" : range === "monthly" ? "Monthly" : "All"} Incident Trends
          </CardTitle>
          <div className="flex items-center gap-0.5 bg-secondary/50 rounded-md p-0.5">
            {(["weekly", "monthly", "all"] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                  range === r
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "weekly" ? "7D" : r === "monthly" ? "30D" : "All"}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-3 pt-0">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={data} barGap={1} barSize={range === "weekly" ? 14 : range === "all" ? 18 : 6}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={9}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              width={24}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: 11,
                padding: "6px 10px",
              }}
            />
            <Bar dataKey="detected" fill="hsl(var(--primary))" name="Detected" radius={[3, 3, 0, 0]} />
            <Bar dataKey="resolved" fill="hsl(var(--success))" name="Resolved" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {/* Inline mini legend */}
        <div className="flex items-center justify-center gap-4 mt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: "hsl(var(--primary))" }} />
            <span className="text-[10px] text-muted-foreground">Detected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: "hsl(var(--success))" }} />
            <span className="text-[10px] text-muted-foreground">Resolved</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IncidentChart;
