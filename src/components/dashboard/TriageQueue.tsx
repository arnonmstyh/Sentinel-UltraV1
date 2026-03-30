import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIncidents } from "@/context/useIncidents";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const TriageQueue = () => {
  const { incidents } = useIncidents();
  const queue = incidents
    .filter(i => !/(^|\b)yes($|\b)/i.test(i.timelineEvents?.[0]?.description || ""))
    .sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1))
    .slice(0, 10);

  const getSeverityVariant = (severity: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      default: return "secondary";
    }
  };

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle>Triage Queue (Unresponded)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {queue.length === 0 && <p className="text-sm text-muted-foreground">No unresponded incidents.</p>}
        {queue.map((i) => (
          <Link key={i.id} to={`/incidents/${i.id}`} className="block p-3 rounded-md bg-secondary/30 hover:bg-secondary/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{i.title}</p>
                <p className="text-xs text-muted-foreground">{i.description}</p>
              </div>
              <Badge variant={getSeverityVariant(i.severity)} className="capitalize">{i.severity}</Badge>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
};

export default TriageQueue;



