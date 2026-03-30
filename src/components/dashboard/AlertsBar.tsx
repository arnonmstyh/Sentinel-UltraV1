import { useEffect, useMemo, useState } from "react";
import { useIncidents } from "@/context/useIncidents";
import { Bell, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const SEEN_KEY = "alerts_seen_ids_v1";

const getStatusColor = (status: string) => {
  switch (status) {
    case "open": return "bg-red-500";
    case "investigating": return "bg-yellow-500";
    case "resolved": return "bg-green-500";
    case "closed": return "bg-gray-500";
    default: return "bg-muted";
  }
};

const getStatusTextColor = (status: string) => {
  switch (status) {
    case "open": return "text-red-400";
    case "investigating": return "text-yellow-400";
    case "resolved": return "text-green-400";
    case "closed": return "text-gray-400";
    default: return "text-muted-foreground";
  }
};

const AlertsBar = () => {
  const { incidents } = useIncidents();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [seen, setSeen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      if (raw) setSeen(JSON.parse(raw));
    } catch { }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch { }
  }, [seen]);

  // Alerts from timeline events
  const alerts = useMemo(() => {
    return incidents
      .flatMap(incident =>
        (incident.timelineEvents || []).map(event => ({
          id: `${incident.id}-${event.id}`,
          incidentId: incident.id,
          title: incident.title,
          status: event.status,
          description: event.description,
          timestamp: event.timestamp,
        }))
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 25);
  }, [incidents]);

  // Recent activity from incidents (latest 5)
  const recentActivity = useMemo(() => {
    return incidents
      .map(incident => ({
        id: `activity-${incident.id}`,
        incidentId: incident.id,
        timestamp: incident.createdAt,
        status: incident.status,
        description: `${incident.type} from ${incident.sourceIP}`,
        user: incident.responder || "System",
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [incidents]);

  const unseen = alerts.filter(a => !seen[a.id]);
  const markSeen = (id: string) => setSeen(prev => ({ ...prev, [id]: true }));

  return (
    <Card className="border-border bg-gradient-card">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Alerts toggle */}
          <button
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            onClick={() => { setAlertsOpen(!alertsOpen); setActivityOpen(false); }}
          >
            <Bell className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Alerts</span>
            {unseen.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/90 text-white font-semibold min-w-[18px] text-center">
                {unseen.length}
              </span>
            )}
            {alertsOpen ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
          </button>

          <div className="w-px h-4 bg-border" />

          {/* Recent Activity toggle */}
          <button
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            onClick={() => { setActivityOpen(!activityOpen); setAlertsOpen(false); }}
          >
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Recent Activity</span>
            {activityOpen ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
          </button>

          {/* Summary when both closed */}
          {!alertsOpen && !activityOpen && (
            <span className="text-xs text-muted-foreground ml-auto">
              {unseen.length > 0
                ? `${unseen.length} unseen alert${unseen.length > 1 ? "s" : ""}`
                : "All caught up"
              }
              {" \u00b7 "}
              {recentActivity.length} recent
            </span>
          )}
        </div>

        {/* Alerts panel */}
        {alertsOpen && (
          <div className="mt-3 max-h-56 overflow-auto space-y-1.5">
            {unseen.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No new alerts.</p>
            ) : (
              unseen.map((a) => (
                <div
                  key={a.id}
                  className="p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                  onClick={() => markSeen(a.id)}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground">{a.incidentId}</p>
                    <span className="text-[10px] text-muted-foreground">{a.timestamp.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 break-words">{a.description}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Recent Activity panel (5 items, vertical timeline) */}
        {activityOpen && (
          <div className="mt-3 space-y-0">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No recent activity.</p>
            ) : (
              recentActivity.map((activity, idx) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1 ${getStatusColor(activity.status)}`} />
                    {idx < recentActivity.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{activity.incidentId}</span>
                        <span className={`text-[10px] font-medium capitalize ${getStatusTextColor(activity.status)}`}>
                          {activity.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug break-words">{activity.description}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{activity.user}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsBar;
