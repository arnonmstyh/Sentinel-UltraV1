import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Shield, AlertTriangle, Target, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Incident {
  id: string;
  sourceIP: string;
  destinationIPs: string[];
  type: string;
  severity: string;
  status: string;
  country: string;
  responder: string;
  responseStatus: string;
  createdAt: Date;
}

interface IncidentAttackVectorProps {
  incident: Incident;
}

const IncidentAttackVector = ({ incident }: IncidentAttackVectorProps) => {
  const [expandedTargets, setExpandedTargets] = useState(false);

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

  const toggleExpandedTargets = () => {
    setExpandedTargets(!expandedTargets);
  };

  return (
    <Card className="bg-gradient-card border-border overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="w-5 h-5 text-primary" />
          Attack Vector Analysis
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Attack flow analysis for incident {incident.id}
        </p>
      </CardHeader>
      <CardContent className="overflow-hidden">
        <div className="space-y-6">
          {/* Attack Flow Card */}
          <div className="bg-secondary/30 rounded-lg p-6 border border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <span className="font-mono text-sm font-bold text-primary">{incident.id}</span>
                </div>
                <Badge className={`${getSeverityColor(incident.severity)} text-white`}>
                  {incident.severity.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {incident.type.replace("-", " ")}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  {incident.createdAt.toLocaleDateString()}
                </div>
                <div className={`text-sm font-medium ${getStatusColor(incident.status)}`}>
                  {incident.status.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Attack Flow Visualization */}
            <div className="flex items-center justify-between mb-4 overflow-hidden">
              {/* Source */}
              <div className="flex flex-col items-center text-center min-w-0 max-w-[30%]">
                <div className="w-16 h-16 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center mb-2 shrink-0">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <div className="text-sm font-medium text-foreground">Source</div>
                <div className="text-xs text-muted-foreground font-mono break-all">{incident.sourceIP || 'Unknown'}</div>
                <div className="text-xs text-muted-foreground">{incident.country || 'Unknown'}</div>
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
              <div className="flex flex-col items-center text-center min-w-0 max-w-[30%]">
                <div className="w-16 h-16 rounded-full bg-blue-100 border-2 border-blue-300 flex items-center justify-center mb-2 shrink-0">
                  <Target className="w-8 h-8 text-blue-600" />
                </div>
                <div className="text-sm font-medium text-foreground">Target</div>
                <div className="text-xs text-muted-foreground mb-1">
                  {incident.destinationIPs?.length > 0 ? `${incident.destinationIPs.length} IP${incident.destinationIPs.length !== 1 ? 's' : ''}` : 'Unknown'}
                </div>
                <div className="max-w-48 w-full overflow-hidden">
                  {incident.destinationIPs && incident.destinationIPs.length > 0 ? (
                    <div className="space-y-1">
                      {!expandedTargets ? (
                        // Compact view - show first 2 IPs with "..." if more
                        <div className="space-y-1">
                          {incident.destinationIPs.slice(0, 2).map((ip, idx) => (
                            <div key={idx} className="text-xs font-mono text-foreground bg-secondary/50 px-2 py-1 rounded border break-all">
                              {ip}
                            </div>
                          ))}
                          {incident.destinationIPs.length > 2 && (
                            <div className="text-xs text-muted-foreground text-center">
                              ... and {incident.destinationIPs.length - 2} more
                            </div>
                          )}
                          {incident.destinationIPs.length > 2 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-6 px-2 w-full"
                              onClick={toggleExpandedTargets}
                            >
                              <ChevronDown className="w-3 h-3 mr-1" />
                              View all IPs
                            </Button>
                          )}
                        </div>
                      ) : (
                        // Expanded view - show all IPs
                        <div className="space-y-1">
                          {incident.destinationIPs.map((ip, idx) => (
                            <div key={idx} className="text-xs font-mono text-foreground bg-secondary/50 px-2 py-1 rounded border break-all">
                              {ip}
                            </div>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 px-2 w-full"
                            onClick={toggleExpandedTargets}
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
            <div className="flex items-center justify-between pt-4 border-t border-border flex-wrap gap-y-2 overflow-hidden">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Responder:</span>
                  <span className="text-sm font-medium text-foreground">
                    {incident.responder !== 'Unassigned' ? incident.responder : 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Response:</span>
                  <Badge variant={incident.responseStatus === 'responded' ? 'default' : 'secondary'} className="text-xs">
                    {incident.responseStatus?.toUpperCase() || 'PENDING'}
                  </Badge>
                </div>
              </div>
              <div className="text-xs text-muted-foreground min-w-0 max-w-[200px]">
                <div className="font-medium">
                  {incident.destinationIPs?.length || 0} target{(incident.destinationIPs?.length || 0) !== 1 ? 's' : ''}
                </div>
                {incident.destinationIPs && incident.destinationIPs.length > 0 && (
                  <div className="mt-1">
                    {incident.destinationIPs.length <= 2 ? (
                      <div className="space-y-1">
                        {incident.destinationIPs.map((ip, idx) => (
                          <div key={idx} className="text-xs font-mono text-foreground bg-secondary/30 px-1 py-0.5 rounded break-all">
                            {ip}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-xs font-mono text-foreground bg-secondary/30 px-1 py-0.5 rounded break-all">
                          {incident.destinationIPs[0]}
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                          ... and {incident.destinationIPs.length - 1} more
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="bg-secondary/20 rounded-lg p-4 border border-border">
            <h4 className="font-semibold text-foreground mb-3">Attack Vector Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">1</div>
                <div className="text-muted-foreground">Total Vectors</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${incident.severity === 'critical' ? 'text-red-500' : incident.severity === 'high' ? 'text-orange-500' : 'text-gray-500'}`}>
                  {incident.severity === 'critical' || incident.severity === 'high' ? '1' : '0'}
                </div>
                <div className="text-muted-foreground">Critical/High</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {incident.destinationIPs?.length || 0}
                </div>
                <div className="text-muted-foreground">Targets</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${incident.responseStatus === 'responded' ? 'text-green-500' : 'text-red-500'}`}>
                  {incident.responseStatus === 'responded' ? '1' : '0'}
                </div>
                <div className="text-muted-foreground">Responded</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IncidentAttackVector;
