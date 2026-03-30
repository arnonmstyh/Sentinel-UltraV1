import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { useIncidents } from "@/context/useIncidents";

const TimelineChart = () => {
  const { incidents, loading } = useIncidents();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-red-500";
      case "investigating": return "bg-yellow-500";
      case "resolved": return "bg-green-500";
      case "closed": return "bg-gray-500";
      default: return "bg-muted";
    }
  };

  // Since your real data doesn't have timeline events, we'll create activity from incident updates
  const recentActivity = incidents
    .map(incident => ({
      id: `activity-${incident.id}`,
      timestamp: incident.createdAt,
      status: incident.status,
      description: `${incident.type} incident from ${incident.sourceIP}`,
      user: incident.responder || 'System',
      incidentId: incident.id,
      incidentTitle: incident.title,
      duration: incident.responseTime ? Math.round((new Date(incident.responseTime).getTime() - new Date(incident.createdAt).getTime()) / (1000 * 60)) : undefined
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading recent activity...</div>
          </div>
        ) : incidents.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">No activity found</div>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivity.map((activity, idx) => (
            <div key={`${activity.incidentId}-${activity.id}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(activity.status)}`} />
                {idx < recentActivity.length - 1 && (
                  <div className="w-0.5 h-12 bg-border mt-2" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-medium text-foreground">{activity.incidentId}</p>
                  <span className="text-xs text-muted-foreground">
                    {activity.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{activity.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-primary capitalize">{activity.status}</span>
                  {activity.duration && (
                    <span className="text-xs text-muted-foreground">• {activity.duration}min</span>
                  )}
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

export default TimelineChart;
