import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useIncidents } from "@/context/useIncidents";
import { ArrowLeft, Clock, Edit2, MapPin, Network, Plus, Save, Shield, Trash2, User, X } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import IncidentAttackVector from "@/components/dashboard/IncidentAttackVector";
import type { IncidentStatus } from "@/types/incident";

const IncidentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { incidents, updateIncident, deleteIncident } = useIncidents();
  const incident = incidents.find(i => i.id === id);

  const [isEditing, setIsEditing] = useState(false);
  const [editedIncident, setEditedIncident] = useState({
    status: '',
    responder: '',
    responseStatus: '',
    notes: ''
  });

  // Timeline event form state
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEventStatus, setNewEventStatus] = useState<IncidentStatus>("investigating");
  const [newEventDescription, setNewEventDescription] = useState("");

  useEffect(() => {
    if (incident) {
      setEditedIncident({
        status: incident.status,
        responder: incident.responder || '',
        responseStatus: incident.responseStatus || 'pending',
        notes: incident.notes || ''
      });
    }
  }, [incident]);

  if (!incident) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Incident Not Found</h1>
          <Link to="/incidents">
            <Button variant="outline">Back to Incidents</Button>
          </Link>
        </div>
      </div>
    );
  }

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

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case "open": return "bg-red-500";
      case "investigating": return "bg-yellow-500";
      case "resolved": return "bg-green-500";
      case "closed": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "open": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "investigating": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "resolved": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "closed": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getResponseStatusDisplay = () => {
    if (incident.responseStatus === 'responded') {
      return { text: 'Blocked', color: 'text-green-500', bg: 'bg-green-100' };
    }
    return { text: 'No Response', color: 'text-red-500', bg: 'bg-red-100' };
  };

  const handleSave = () => {
    updateIncident(incident.id, {
      status: editedIncident.status as any,
      responder: editedIncident.responder,
      responseStatus: editedIncident.responseStatus as any,
      notes: editedIncident.notes
    });
    setIsEditing(false);
    toast.success("Incident updated successfully");
  };

  const handleCancel = () => {
    setEditedIncident({
      status: incident.status,
      responder: incident.responder || '',
      responseStatus: incident.responseStatus || 'pending',
      notes: incident.notes || ''
    });
    setIsEditing(false);
    setShowEventForm(false);
  };

  const handleDelete = () => {
    deleteIncident(incident.id);
    toast.success("Incident deleted successfully");
    navigate("/incidents");
  };

  const handleAddTimelineEvent = () => {
    if (!newEventDescription.trim()) {
      toast.error("Please enter a description for the timeline event");
      return;
    }

    const newEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      status: newEventStatus,
      description: newEventDescription.trim(),
      user: "Admin",
    };

    const updatedTimeline = [...(incident.timelineEvents || []), newEvent];
    updateIncident(incident.id, { timelineEvents: updatedTimeline });

    setNewEventStatus("investigating");
    setNewEventDescription("");
    setShowEventForm(false);
    toast.success("Timeline event added");
  };

  const formatTimestamp = (ts: string | Date) => {
    try {
      const date = typeof ts === "string" ? new Date(ts) : ts;
      return format(date, "MMM dd, yyyy 'at' HH:mm:ss");
    } catch {
      return String(ts);
    }
  };

  const responseStatusDisplay = getResponseStatusDisplay();

  const sortedTimelineEvents = [...(incident.timelineEvents || [])].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA; // newest first
  });

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/incidents">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold font-mono text-primary">{incident.id}</h1>
              <Badge className={`${getSeverityColor(incident.severity)} text-white border-0`}>
                {incident.severity.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {incident.type.replace("-", " ")}
              </Badge>
            </div>
            <p className="text-muted-foreground">{incident.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleCancel} variant="outline" size="sm">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} size="sm">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-background border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Incident</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete incident <span className="font-mono font-semibold text-foreground">{incident.id}</span>? This action cannot be undone and all associated data will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Delete Incident
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={() => setIsEditing(true)} size="sm">
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Incident
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Current Status</p>
              {isEditing ? (
                <Select value={editedIncident.status} onValueChange={(value) => setEditedIncident(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={`${getStatusColor(incident.status)} text-white border-0 capitalize`}>
                  {incident.status}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Response Status</p>
              <Badge className={`${responseStatusDisplay.bg} ${responseStatusDisplay.color} border-0`}>
                {responseStatusDisplay.text}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Response By</p>
              {isEditing ? (
                <Input
                  value={editedIncident.responder}
                  onChange={(e) => setEditedIncident(prev => ({ ...prev, responder: e.target.value }))}
                  placeholder="Enter responder name"
                  className="text-center"
                />
              ) : (
                <p className="text-sm font-medium text-foreground">{incident.responder || "Unassigned"}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Country</p>
              <p className="text-sm font-medium text-foreground">{incident.country || "Unknown"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card className="bg-gradient-card border-border md:col-span-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Incident Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Input
                value={editedIncident.notes || ''}
                onChange={(e) => setEditedIncident(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add notes about this incident..."
                className="w-full"
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {incident.notes || "No notes added."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attack Vector Analysis */}
      <IncidentAttackVector incident={incident} />

      {/* Timeline Visualization */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Incident Timeline
            </CardTitle>
            {isEditing && !showEventForm && (
              <Button onClick={() => setShowEventForm(true)} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Add Event Form (inline, visible only in edit mode) */}
          {isEditing && showEventForm && (
            <div className="mb-6 p-4 rounded-lg border border-border bg-muted/30 space-y-4">
              <h4 className="text-sm font-semibold text-foreground">New Timeline Event</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                  <Select value={newEventStatus} onValueChange={(v) => setNewEventStatus(v as IncidentStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                  <Input
                    value={newEventDescription}
                    onChange={(e) => setNewEventDescription(e.target.value)}
                    placeholder="Describe what happened..."
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowEventForm(false);
                    setNewEventDescription("");
                    setNewEventStatus("investigating");
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddTimelineEvent}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Event
                </Button>
              </div>
            </div>
          )}

          {/* Timeline Events */}
          {sortedTimelineEvents.length > 0 ? (
            <div className="relative">
              {sortedTimelineEvents.map((event, index) => (
                <div key={event.id} className="relative flex gap-4">
                  {/* Vertical line + dot */}
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${getStatusDotColor(event.status)} ring-4 ring-background z-10 shrink-0 mt-1`} />
                    {index < sortedTimelineEvents.length - 1 && (
                      <div className="w-0.5 flex-1 bg-border min-h-[40px]" />
                    )}
                  </div>

                  {/* Event content */}
                  <div className="pb-6 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge className={`text-xs capitalize ${getStatusBadgeColor(event.status)}`}>
                        {event.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{event.description}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {event.user}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No timeline events recorded yet.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <Card className="bg-gradient-card border-border overflow-hidden">
            <CardHeader>
              <CardTitle>Incident Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-hidden">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
                <p className="text-sm text-muted-foreground break-words">{incident.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Network className="w-4 h-4 text-primary shrink-0" />
                    <h4 className="text-sm font-semibold text-foreground">Source IP</h4>
                  </div>
                  <p className="text-sm font-mono text-muted-foreground break-all">{incident.sourceIP || "Unknown"}</p>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Network className="w-4 h-4 text-primary shrink-0" />
                    <h4 className="text-sm font-semibold text-foreground">Target IPs</h4>
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    {incident.destinationIPs?.slice(0, 3).map((ip, idx) => (
                      <p key={idx} className="text-sm font-mono text-muted-foreground break-all">{ip}</p>
                    ))}
                    {incident.destinationIPs && incident.destinationIPs.length > 3 && (
                      <p className="text-sm text-muted-foreground">... and {incident.destinationIPs.length - 3} more</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">Geographic Location</h4>
                </div>
                <p className="text-sm text-muted-foreground">{incident.country || "Unknown"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Response Actions */}
          <Card className="bg-gradient-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Response Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Response Status</label>
                  {isEditing ? (
                    <Select value={editedIncident.responseStatus} onValueChange={(value) => setEditedIncident(prev => ({ ...prev, responseStatus: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">No Response</SelectItem>
                        <SelectItem value="responded">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={`${responseStatusDisplay.bg} ${responseStatusDisplay.color} border-0`}>
                      {responseStatusDisplay.text}
                    </Badge>
                  )}
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Response Time</label>
                  <p className="text-sm text-muted-foreground">{incident.responseTime || "Not recorded"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          <Card className="bg-gradient-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Current Responder:</span>
                <p className="text-foreground font-medium">{incident.responder || "Unassigned"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Response Status:</span>
                <p className={`font-medium ${responseStatusDisplay.color}`}>{responseStatusDisplay.text}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Incident Type:</span>
                <p className="text-foreground font-medium capitalize">{incident.type.replace("-", " ")}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border">
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Created:</span>
                <p className="text-foreground font-medium">{incident.createdAt.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <p className="text-foreground font-medium">{incident.updatedAt.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Severity:</span>
                <p className="text-foreground font-medium capitalize">{incident.severity}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetail;
