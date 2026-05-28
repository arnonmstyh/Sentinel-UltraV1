import type { IncidentSeverity, IncidentStatus } from "@/types/incident";

export const SEVERITY_RANK: Record<IncidentSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function isDangerous(severity: string): boolean {
  return severity === "critical" || severity === "high";
}

export function getSeverityFill(severity: string): string {
  switch (severity) {
    case "critical": return "bg-red-500";
    case "high": return "bg-orange-500";
    case "medium": return "bg-yellow-500";
    case "low": return "bg-green-500";
    default: return "bg-gray-500";
  }
}

export function getSeverityRing(severity: string): string {
  switch (severity) {
    case "critical": return "ring-red-500/60";
    case "high": return "ring-orange-500/60";
    case "medium": return "ring-yellow-500/60";
    case "low": return "ring-green-500/60";
    default: return "ring-gray-500/40";
  }
}

export function getSeverityEdgeColor(severity: string): string {
  switch (severity) {
    case "critical": return "#ef4444";
    case "high": return "#f97316";
    case "medium": return "#eab308";
    case "low": return "#22c55e";
    default: return "#9ca3af";
  }
}

export function getStatusText(status: string): string {
  switch (status) {
    case "open": return "text-red-500";
    case "investigating": return "text-yellow-500";
    case "resolved": return "text-green-500";
    case "closed": return "text-gray-500";
    default: return "text-muted-foreground";
  }
}

export function getStatusFill(status: string): string {
  switch (status) {
    case "open": return "bg-red-500";
    case "investigating": return "bg-yellow-500";
    case "resolved": return "bg-green-500";
    case "closed": return "bg-gray-500";
    default: return "bg-gray-500";
  }
}

export function getStatusBadge(status: string): string {
  switch (status) {
    case "open": return "bg-red-500/15 text-red-400 border-red-500/40";
    case "investigating": return "bg-yellow-500/15 text-yellow-400 border-yellow-500/40";
    case "resolved": return "bg-green-500/15 text-green-400 border-green-500/40";
    case "closed": return "bg-gray-500/15 text-gray-400 border-gray-500/40";
    default: return "bg-gray-500/15 text-gray-400 border-gray-500/40";
  }
}

export const LIFECYCLE_ORDER: IncidentStatus[] = ["open", "investigating", "resolved", "closed"];
