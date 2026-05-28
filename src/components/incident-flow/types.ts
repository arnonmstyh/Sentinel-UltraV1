import type { IncidentSeverity, IncidentStatus } from "@/types/incident";

export type IncidentFlowNodeKind =
  | "detection"
  | "source"
  | "country"
  | "target"
  | "target-overflow"
  | "response"
  | "status"
  | "responder";

export interface DetectionNodeData {
  kind: "detection";
  createdAt: Date;
}

export interface ResponseNodeData {
  kind: "response";
  responseTime?: string;
  responseStatus?: "responded" | "pending";
}

export interface SourceNodeData {
  kind: "source";
  ip: string;
  country?: string;
  severity: IncidentSeverity;
}

export interface CountryNodeData {
  kind: "country";
  country: string;
}

export interface TargetNodeData {
  kind: "target";
  ip: string;
  severity: IncidentSeverity;
}

export interface TargetOverflowNodeData {
  kind: "target-overflow";
  remaining: number;
  ips: string[];
}

export interface StatusNodeData {
  kind: "status";
  status: IncidentStatus;
  timestamp?: Date;
  actor?: string;
  reached: boolean;
  current: boolean;
}

export interface ResponderNodeData {
  kind: "responder";
  name: string;
  code: string;
  color: string;
  responseTime?: string;
  responded: boolean;
}

export type IncidentFlowNodeData =
  | DetectionNodeData
  | SourceNodeData
  | CountryNodeData
  | TargetNodeData
  | TargetOverflowNodeData
  | ResponseNodeData
  | StatusNodeData
  | ResponderNodeData;
