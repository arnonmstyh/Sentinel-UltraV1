import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Network, Shield, AlertTriangle, Target, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { useIncidents } from "@/context/useIncidents";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AttackFlow {
  id: string;
  sourceIP: string;
  targetIPs: string[];
  incidentType: string;
  severity: string;
  status: string;
  country: string;
  responder: string;
  responseStatus: string;
  createdAt: Date;
}

const AttackVectorGraph = () => {
  const { incidents, loading } = useIncidents();
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());

  const sourceIps = useMemo(() => {
    const set = new Set<string>();
    incidents.forEach(i => { if (i.sourceIP) set.add(i.sourceIP); });
    return Array.from(set).sort();
  }, [incidents]);

  const attackFlows = useMemo(() => {
    return incidents
      .filter(incident => 
        (selectedSource === "all" || incident.sourceIP === selectedSource) &&
        (selectedSeverity === "all" || incident.severity === selectedSeverity)
      )
      .slice(0, 10) // Limit to 10 for readability
      .map(incident => ({
        id: incident.id,
        sourceIP: incident.sourceIP || 'Unknown',
        targetIPs: incident.destinationIPs || [],
        incidentType: incident.type,
        severity: incident.severity,
        status: incident.status,
        country: incident.country || 'Unknown',
        responder: incident.responder || 'Unassigned',
        responseStatus: incident.responseStatus || 'pending',
        createdAt: incident.createdAt
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [incidents, selectedSource, selectedSeverity]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "text-red-500";
      case "investigating": return "text-yellow-500";
      case "resolved": return "text-green-500";
      case "closed": return "text-gray-500";
      default: return "text-muted-foreground";
    }
  };

  const toggleExpandedTargets = (flowId: string) => {
    const newExpanded = new Set(expandedTargets);
    if (newExpanded.has(flowId)) {
      newExpanded.delete(flowId);
    } else {
      newExpanded.add(flowId);
    }
    setExpandedTargets(newExpanded);
  };

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="w-5 h-5 text-primary" />
          Attack Vector Analysis
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Professional attack flow analysis showing source-to-target relationships and incident progression
        </p>
        <div className="flex gap-4 mt-4">
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="w-48 bg-secondary border-border">
              <SelectValue placeholder="Filter by Source IP" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sourceIps.map(ip => (
                <SelectItem key={ip} value={ip}>{ip}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
            <SelectTrigger className="w-48 bg-secondary border-border">
              <SelectValue placeholder="Filter by Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-muted-foreground">Loading attack vectors...</div>
          </div>
        ) : attackFlows.length === 0 ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-muted-foreground">No attack vectors found</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Attack Flow Cards */}
            {attackFlows.map((flow, index) => (
              <div key={flow.id} className="bg-secondary/30 rounded-lg p-6 border border-border">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-500" />
                      <span className="font-mono text-sm font-bold text-primary">{flow.id}</span>
                    </div>
                    <Badge className={`${getSeverityColor(flow.severity)} text-white`}>
                      {flow.severity.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {flow.incidentType}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {flow.createdAt.toLocaleDateString()}
                    </div>
                    <div className={`text-sm font-medium ${getStatusColor(flow.status)}`}>
                      {flow.status.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Attack Flow Visualization */}
                <div className="flex items-center justify-between mb-4">
                  {/* Source */}
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center mb-2">
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <div className="text-sm font-medium text-foreground">Source</div>
                    <div className="text-xs text-muted-foreground font-mono">{flow.sourceIP}</div>
                    <div className="text-xs text-muted-foreground">{flow.country}</div>
                  </div>

                  {/* Arrow */}
                  <div className="flex-1 flex justify-center">
                    <div className="flex items-center gap-2">
                      <div className="h-0.5 w-16 bg-border"></div>
                      <ArrowRight className="w-6 h-6 text-muted-foreground" />
                      <div className="h-0.5 w-16 bg-border"></div>
                    </div>
                  </div>

                  {/* Target */}
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-100 border-2 border-blue-300 flex items-center justify-center mb-2">
                      <Target className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="text-sm font-medium text-foreground">Target</div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {flow.targetIPs.length > 0 ? `${flow.targetIPs.length} IP${flow.targetIPs.length !== 1 ? 's' : ''}` : 'Unknown'}
                    </div>
                    <div className="max-w-48">
                      {flow.targetIPs.length > 0 ? (
                        <div className="space-y-1">
                          {!expandedTargets.has(flow.id) ? (
                            // Compact view - show first 2 IPs with "..." if more
                            <div className="space-y-1">
                              {flow.targetIPs.slice(0, 2).map((ip, idx) => (
                                <div key={idx} className="text-xs font-mono text-foreground bg-secondary/50 px-2 py-1 rounded border break-all">
                                  {ip}
                                </div>
                              ))}
                              {flow.targetIPs.length > 2 && (
                                <div className="text-xs text-muted-foreground text-center">
                                  ... and {flow.targetIPs.length - 2} more
                                </div>
                              )}
                              {flow.targetIPs.length > 2 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-6 px-2 w-full"
                                  onClick={() => toggleExpandedTargets(flow.id)}
                                >
                                  <ChevronDown className="w-3 h-3 mr-1" />
                                  View all IPs
                                </Button>
                              )}
                            </div>
                          ) : (
                            // Expanded view - show all IPs
                            <div className="space-y-1">
                              {flow.targetIPs.map((ip, idx) => (
                                <div key={idx} className="text-xs font-mono text-foreground bg-secondary/50 px-2 py-1 rounded border break-all">
                                  {ip}
                                </div>
                              ))}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-6 px-2 w-full"
                                onClick={() => toggleExpandedTargets(flow.id)}
                              >
                                <ChevronUp className="w-3 h-3 mr-1" />
                                Show less
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No targets</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Response Information */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Responder:</span>
                      <span className="text-sm font-medium text-foreground">
                        {flow.responder !== 'Unassigned' ? flow.responder : 'Unassigned'}
                      </span>
              </div>
              <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Response:</span>
                      <Badge variant={flow.responseStatus === 'responded' ? 'default' : 'secondary'} className="text-xs">
                        {flow.responseStatus.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <div className="font-medium">
                      {flow.targetIPs.length} target{flow.targetIPs.length !== 1 ? 's' : ''}
                    </div>
                    {flow.targetIPs.length > 0 && (
                      <div className="mt-1">
                        {flow.targetIPs.length <= 2 ? (
                          // Show all IPs if 2 or fewer
                          <div className="space-y-1">
                            {flow.targetIPs.map((ip, idx) => (
                              <div key={idx} className="text-xs font-mono text-foreground bg-secondary/30 px-1 py-0.5 rounded">
                                {ip}
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Show first IP with "..." for more
                          <div className="space-y-1">
                            <div className="text-xs font-mono text-foreground bg-secondary/30 px-1 py-0.5 rounded">
                              {flow.targetIPs[0]}
                            </div>
                            <div className="text-xs text-muted-foreground text-center">
                              ... and {flow.targetIPs.length - 1} more
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Summary Statistics */}
            <div className="bg-secondary/20 rounded-lg p-4 border border-border">
              <h4 className="font-semibold text-foreground mb-3">Attack Vector Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{attackFlows.length}</div>
                  <div className="text-muted-foreground">Total Vectors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {attackFlows.filter(f => f.severity === 'critical').length}
                  </div>
                  <div className="text-muted-foreground">Critical</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">
                    {attackFlows.filter(f => f.severity === 'high').length}
                  </div>
                  <div className="text-muted-foreground">High</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {attackFlows.filter(f => f.responseStatus === 'responded').length}
                  </div>
                  <div className="text-muted-foreground">Responded</div>
              </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttackVectorGraph;
