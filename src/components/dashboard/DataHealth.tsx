import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIncidents } from "@/context/useIncidents";
import { useMemo, useState } from "react";

const ipRegex = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.|$)){4}$/;

const DataHealth = () => {
  const { incidents, refreshData, loading } = useIncidents();
  const [validating, setValidating] = useState(false);

  const summary = useMemo(() => {
    let missingRequired = 0;
    let invalidDates = 0;
    let invalidIps = 0;
    let badDstArrays = 0;
    incidents.forEach(i => {
      // Required fields (from sheet headers, mapped into our model): type, severity, status, createdAt, description(country)
      if (!i.type || !i.severity || !i.status) missingRequired += 1;
      if (!(i.createdAt instanceof Date) || isNaN(i.createdAt.getTime())) invalidDates += 1;
      if (i.sourceIp && !ipRegex.test(i.sourceIp)) invalidIps += 1;
      // dst_IP list is embedded in description; treat long comma list as ok; skip strict
      const dstMatch = i.description.match(/dst_IP: ([^|]+)/);
      if (dstMatch) {
        const raw = dstMatch[1].trim();
        try {
          if (raw.startsWith("[")) {
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr)) badDstArrays += 1;
          }
        } catch {
          badDstArrays += 1;
        }
      }
    });
    return { total: incidents.length, missingRequired, invalidDates, invalidIps, badDstArrays };
  }, [incidents]);

  const handleResync = async () => {
    setValidating(true);
    try {
      await refreshData();
    } finally {
      setValidating(false);
    }
  };

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Data Health</span>
          <Button size="sm" onClick={handleResync} disabled={loading || validating}>
            {validating ? "Validating..." : "Re-sync & Validate"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-muted-foreground">Records</p>
          <p className="font-medium text-foreground">{summary.total}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Missing required</p>
          <p className={`font-medium ${summary.missingRequired ? 'text-critical' : 'text-foreground'}`}>{summary.missingRequired}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Invalid dates</p>
          <p className={`font-medium ${summary.invalidDates ? 'text-high' : 'text-foreground'}`}>{summary.invalidDates}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Invalid IPs</p>
          <p className={`font-medium ${summary.invalidIps ? 'text-high' : 'text-foreground'}`}>{summary.invalidIps}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataHealth;



