import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useIncidents } from "@/context/useIncidents";
import { Trophy, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

const ResponderLeaderboard = () => {
  const { incidents } = useIncidents();

  // Calculate responder statistics
  const responderStats = incidents.reduce((acc, incident) => {
    const responder = incident.responder || "Unassigned";
    if (!acc[responder]) {
      acc[responder] = {
        name: responder,
        total: 0,
        responded: 0,
        critical: 0,
        high: 0,
        avgResponseTime: 0,
        totalResponseTime: 0,
      };
    }
    
    acc[responder].total += 1;
    if (incident.responseStatus === "responded") {
      acc[responder].responded += 1;
    }
    if (incident.severity === "critical") {
      acc[responder].critical += 1;
    }
    if (incident.severity === "high") {
      acc[responder].high += 1;
    }
    
    // Calculate response time (simplified - using response time if available)
    if (incident.responseStatus === "responded" && incident.responseTime) {
      // Simple calculation - could be improved with actual time parsing
      acc[responder].totalResponseTime += 1; // Placeholder for now
    }
    
    return acc;
  }, {} as Record<string, any>);

  // Calculate average response time and sort by performance
  const leaderboard = Object.values(responderStats)
    .filter((responder: any) => responder.name !== "Unassigned") // Filter out unassigned
    .map((responder: any) => ({
      ...responder,
      avgResponseTime: responder.responded > 0 ? Math.round(responder.totalResponseTime / responder.responded) : 0,
      responseRate: responder.total > 0 ? Math.round((responder.responded / responder.total) * 100) : 0,
    }))
    .sort((a, b) => {
      // Sort by response rate first, then by total incidents
      if (b.responseRate !== a.responseRate) {
        return b.responseRate - a.responseRate;
      }
      return b.total - a.total;
    })
    .slice(0, 10); // Top 10 responders (scrollable)

  const getInitials = (name: string) => {
    if (name === "Unassigned") return "UN";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 1: return <Trophy className="w-4 h-4 text-gray-400" />;
      case 2: return <Trophy className="w-4 h-4 text-amber-600" />;
      default: return <span className="w-4 h-4 text-center text-xs font-bold text-muted-foreground">{index + 1}</span>;
    }
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return "text-green-500";
    if (rate >= 60) return "text-yellow-500";
    if (rate > 0) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <Card className="bg-gradient-card border-border h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Responder Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
          {leaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No responder data available</p>
            </div>
          ) : (
            leaderboard.map((responder, index) => (
              <div key={responder.name} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-card/50 border border-border/50">
                <div className="flex items-center justify-center w-6 flex-shrink-0">
                  {getRankIcon(index)}
                </div>

                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarFallback className="text-[10px] font-semibold">
                    {getInitials(responder.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {responder.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground tabular-nums">{responder.total} total</span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{responder.responded} resp</span>
                    {responder.critical > 0 && (
                      <>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-red-400 font-medium tabular-nums">{responder.critical} crit</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className={`text-xs font-semibold ${getPerformanceColor(responder.responseRate)}`}>
                    {responder.responseRate}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {leaderboard.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border flex-shrink-0">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{leaderboard.length} responders</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span>Rate</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResponderLeaderboard;
