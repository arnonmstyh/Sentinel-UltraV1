export type IncidentStatus = "open" | "investigating" | "resolved" | "closed";
export type IncidentSeverity = "critical" | "high" | "medium" | "low";
export type IncidentType = "malware" | "phishing" | "dos" | "data-breach" | "unauthorized-access" | "tcp-scan" | "invalid-tcp-flags" | "tcp-handshake-violation" | "geolocation-permanent" | "other";

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  type: string; // Allow any string type from Google Sheets
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  sourceIP?: string;
  destinationIPs?: string[];
  country?: string;
  responder?: string;
  responseTime?: string;
  responseStatus?: 'responded' | 'pending';
  notes?: string;
  timelineEvents: TimelineEvent[];
  version: number;
  deletedAt?: Date | null;
}

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  status: IncidentStatus;
  description: string;
  user: string;
  duration?: number; // in minutes
}
