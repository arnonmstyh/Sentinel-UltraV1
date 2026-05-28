import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { Incident, IncidentStatus, TimelineEvent } from "@/types/incident";
import { hashToTeamColor, codeFromName } from "@/lib/raceMetrics";
import { getSeverityEdgeColor, isDangerous } from "./severity";
import type { IncidentFlowNodeData } from "./types";

const MAX_VISIBLE_TARGETS = 10;

export interface BuildResult {
  nodes: Node<IncidentFlowNodeData>[];
  edges: Edge[];
  visibleTargetIds: string[];
  lifecycleSequence: IncidentStatus[];
  hasResponseNode: boolean;
  responderPresent: boolean;
}

function hasResponder(incident: Incident): boolean {
  const r = (incident.responder || "").trim().toLowerCase();
  return Boolean(r) && r !== "unassigned";
}

function hasResponseData(incident: Incident): boolean {
  return Boolean(
    (incident.responseTime && incident.responseTime.trim()) ||
      incident.responseStatus ||
      hasResponder(incident),
  );
}

function normalizeDestinationIPs(input: string[] | undefined): string[] {
  const raw = (input || []).filter(Boolean).map((s) => String(s).trim());
  const out: string[] = [];
  for (const item of raw) {
    if (item.startsWith("[") && item.endsWith("]") && item.includes(",")) {
      const inner = item.slice(1, -1);
      for (const part of inner.split(",")) {
        const t = part.trim();
        if (t) out.push(t);
      }
    } else {
      out.push(item);
    }
  }
  return out;
}

function buildLifecycleSequence(
  incident: Incident,
): { status: IncidentStatus; event?: TimelineEvent }[] {
  const events = [...(incident.timelineEvents || [])].sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });
  const seen = new Set<IncidentStatus>();
  const sequence: { status: IncidentStatus; event?: TimelineEvent }[] = [];
  for (const e of events) {
    if (!seen.has(e.status)) {
      seen.add(e.status);
      sequence.push({ status: e.status, event: e });
    }
  }
  if (!seen.has(incident.status)) {
    sequence.push({ status: incident.status });
  }
  if (sequence.length === 0) {
    sequence.push({ status: incident.status });
  }
  return sequence;
}

export function buildIncidentFlow(incident: Incident): BuildResult {
  const nodes: Node<IncidentFlowNodeData>[] = [];
  const edges: Edge[] = [];
  const severity = incident.severity;
  const animated = isDangerous(severity);
  const edgeColor = getSeverityEdgeColor(severity);
  const baseStroke = { stroke: edgeColor, strokeWidth: 2 };

  // Detection (first observation) — anchors the IR workflow.
  const detectionId = "detection";
  const createdAt = incident.createdAt instanceof Date ? incident.createdAt : new Date(incident.createdAt);
  nodes.push({
    id: detectionId,
    type: "detection",
    position: { x: 0, y: 0 },
    data: { kind: "detection", createdAt },
  });

  // Source (attacker IP)
  const sourceId = "src";
  nodes.push({
    id: sourceId,
    type: "source",
    position: { x: 0, y: 0 },
    data: {
      kind: "source",
      ip: incident.sourceIP || "Unknown",
      country: incident.country,
      severity,
    },
  });
  edges.push({
    id: "e-det-src",
    source: detectionId,
    target: sourceId,
    targetHandle: "left-in",
    animated,
    style: baseStroke,
    markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
  });

  // Country (geo origin) — optional
  const hasCountry = Boolean(incident.country);
  const countryId = hasCountry ? "country" : null;
  if (countryId) {
    nodes.push({
      id: countryId,
      type: "country",
      position: { x: 0, y: 0 },
      data: { kind: "country", country: incident.country! },
    });
    edges.push({
      id: "e-src-country",
      source: sourceId,
      target: countryId,
      animated,
      style: baseStroke,
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
    });
  }

  // Targets (victim assets) — up to MAX_VISIBLE_TARGETS, the rest collapse into the overflow node.
  const allTargets = normalizeDestinationIPs(incident.destinationIPs);
  const visibleTargets = allTargets.slice(0, MAX_VISIBLE_TARGETS);
  const overflow = allTargets.slice(MAX_VISIBLE_TARGETS);
  const targetParent = countryId ?? sourceId;
  const visibleTargetIds: string[] = [];

  visibleTargets.forEach((ip, idx) => {
    const id = `t-${idx}`;
    visibleTargetIds.push(id);
    nodes.push({
      id,
      type: "target",
      position: { x: 0, y: 0 },
      data: { kind: "target", ip, severity },
    });
    edges.push({
      id: `e-${targetParent}-${id}`,
      source: targetParent,
      target: id,
      animated,
      style: baseStroke,
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
    });
  });

  if (overflow.length > 0) {
    const id = "t-overflow";
    visibleTargetIds.push(id);
    nodes.push({
      id,
      type: "target-overflow",
      position: { x: 0, y: 0 },
      data: { kind: "target-overflow", remaining: overflow.length, ips: overflow },
    });
    edges.push({
      id: `e-${targetParent}-${id}`,
      source: targetParent,
      target: id,
      animated: false,
      style: { stroke: edgeColor, strokeWidth: 1.5, strokeDasharray: "4 4" },
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
    });
  }

  const lifecycleEntries = buildLifecycleSequence(incident);
  const lifecycleIds = new Map<IncidentStatus, string>();
  lifecycleEntries.forEach((entry) => {
    const id = `st-${entry.status}`;
    lifecycleIds.set(entry.status, id);
    nodes.push({
      id,
      type: "status",
      position: { x: 0, y: 0 },
      data: {
        kind: "status",
        status: entry.status,
        timestamp: entry.event?.timestamp
          ? entry.event.timestamp instanceof Date
            ? entry.event.timestamp
            : new Date(entry.event.timestamp)
          : undefined,
        actor: entry.event?.user,
        reached: true,
        current: incident.status === entry.status,
      },
    });
  });

  for (let i = 0; i < lifecycleEntries.length - 1; i++) {
    const from = lifecycleEntries[i].status;
    const to = lifecycleEntries[i + 1].status;
    edges.push({
      id: `e-life-${from}-${to}`,
      source: lifecycleIds.get(from)!,
      target: lifecycleIds.get(to)!,
      animated: false,
      style: { stroke: "#94a3b8", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
    });
  }

  // Only the attacker source feeds the response phase. Targets are leaves of
  // the vector chain (the outcome of the attack); they don't trigger response.
  const bridgeSourceIds = [sourceId];
  const firstLifecycleStatus = lifecycleEntries[0].status;
  const hasResponseNode = hasResponseData(incident);
  const bridgeStroke = { stroke: "#a5b4fc", strokeWidth: 2 };
  const bridgeMarker = { type: MarkerType.ArrowClosed, color: "#a5b4fc" };

  if (hasResponseNode) {
    // Response phase node sits between the vector chain and the lifecycle row.
    nodes.push({
      id: "response",
      type: "response",
      position: { x: 0, y: 0 },
      data: {
        kind: "response",
        responseTime: incident.responseTime?.trim() || undefined,
        responseStatus: incident.responseStatus,
      },
    });
    bridgeSourceIds.forEach((src) => {
      edges.push({
        id: `e-bridge-${src}`,
        source: src,
        sourceHandle: src === sourceId ? "bottom" : undefined,
        target: "response",
        type: "smoothstep",
        animated: false,
        style: bridgeStroke,
        markerEnd: bridgeMarker,
      });
    });
    edges.push({
      id: "e-response-life",
      source: "response",
      target: lifecycleIds.get(firstLifecycleStatus)!,
      targetHandle: "top",
      type: "smoothstep",
      animated: false,
      style: { stroke: "#94a3b8", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
    });
  } else {
    // No response info on file — bridge straight from each source/target to the first lifecycle status.
    bridgeSourceIds.forEach((src) => {
      edges.push({
        id: `e-bridge-${src}`,
        source: src,
        sourceHandle: src === sourceId ? "bottom" : undefined,
        target: lifecycleIds.get(firstLifecycleStatus)!,
        targetHandle: "top",
        type: "smoothstep",
        animated: false,
        style: bridgeStroke,
        markerEnd: bridgeMarker,
      });
    });
  }

  const responderPresent = hasResponder(incident);
  if (responderPresent) {
    const color = hashToTeamColor(incident.responder!);
    nodes.push({
      id: "responder",
      type: "responder",
      position: { x: 0, y: 0 },
      data: {
        kind: "responder",
        name: incident.responder!,
        code: codeFromName(incident.responder!),
        color,
        responseTime: incident.responseTime,
        responded: incident.responseStatus === "responded",
      },
    });
    // Responder attaches to the Response phase if it exists, otherwise to the last reached lifecycle status.
    const responderTarget = hasResponseNode
      ? "response"
      : lifecycleIds.get(lifecycleEntries[lifecycleEntries.length - 1].status)!;
    const sourceHandle = hasResponseNode ? "left" : "top";
    const targetHandle = hasResponseNode ? "responder-out" : "bottom";
    edges.push({
      id: "e-responder",
      source: "responder",
      sourceHandle,
      target: responderTarget,
      targetHandle,
      animated: false,
      style: { stroke: color, strokeWidth: 2, strokeDasharray: "6 4" },
      markerEnd: { type: MarkerType.ArrowClosed, color },
    });
  }

  return {
    nodes,
    edges,
    visibleTargetIds,
    lifecycleSequence: lifecycleEntries.map((e) => e.status),
    hasResponseNode,
    responderPresent,
  };
}
