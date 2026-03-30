import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIncidents } from "@/context/useIncidents";

const severityWeight = (sev: string) => sev === "critical" ? 1 : sev === "high" ? 0.75 : sev === "medium" ? 0.5 : 0.25;

// Normalize country names to match ThreatMap display
const normalizeCountry = (name: string): string => {
  const n = (name || "").trim();
  const lower = n.toLowerCase();
  if (lower.includes("ukrain")) return "Ukraine";
  if (lower.includes("unidentif") || lower.includes("unknown") || !n) return "";
  if (lower.includes("china")) return "China";
  if (lower.includes("russia")) return "Russian Federation";
  if (lower.includes("united states") || lower === "usa") return "United States";
  if (lower.includes("korea") && lower.includes("democratic")) return "North Korea";
  if (lower.includes("korea")) return "South Korea";
  if (lower.includes("cambodia") || lower.includes("khmer")) return "Cambodia";
  if (lower.includes("bangladesh") || lower === "bd") return "Bangladesh";
  return n;
};

const CountryTable = () => {
  const { incidents } = useIncidents();
  const map: Record<string, { count: number; weighted: number }> = {};
  incidents.forEach(i => {
    const country = normalizeCountry(i.country);
    if (!country) return;
    if (!map[country]) map[country] = { count: 0, weighted: 0 };
    map[country].count += 1;
    map[country].weighted += severityWeight(i.severity);
  });
  const rows = Object.entries(map)
    .map(([name, v]) => ({ name, count: v.count, weighted: Number(v.weighted.toFixed(2)) }))
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, 20);

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle>Countries (weighted)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Incidents</TableHead>
                <TableHead className="text-right">Weighted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.name}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-right">{r.count}</TableCell>
                  <TableCell className="text-right">{r.weighted}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CountryTable;



