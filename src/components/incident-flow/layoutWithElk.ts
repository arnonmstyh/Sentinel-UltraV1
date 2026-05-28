import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import type { Edge, Node } from "@xyflow/react";
import type { IncidentStatus } from "@/types/incident";
import type { BuildResult } from "./buildIncidentFlow";
import type { IncidentFlowNodeData } from "./types";

const elk = new ELK();

const NODE_W = 200;
const NODE_H = 84;
const VECTOR_ROW_Y = 0;
const ROW_GAP = 80;
const LIFECYCLE_SPACING = 220;
const STATUS_NODE_W = 180;
const STATUS_NODE_H = 100;
const RESPONSE_NODE_W = 220;
const RESPONSE_NODE_H = 130;
const RESPONDER_NODE_W = 200;
const RESPONDER_GAP = 60;

const VECTOR_DIMS: Record<string, { w: number; h: number }> = {
  detection: { w: 200, h: 90 },
  source: { w: 200, h: 90 },
  country: { w: 160, h: 80 },
  target: { w: 180, h: 64 },
  "target-overflow": { w: 180, h: 64 },
};

const VECTOR_NODE_TYPES = new Set([
  "detection",
  "source",
  "country",
  "target",
  "target-overflow",
]);

function dimsFor(type: string | undefined): { w: number; h: number } {
  if (!type) return { w: NODE_W, h: NODE_H };
  return VECTOR_DIMS[type] ?? { w: NODE_W, h: NODE_H };
}

export interface PositionedFlow {
  nodes: Node<IncidentFlowNodeData>[];
  edges: Edge[];
}

export async function layoutIncidentFlow(build: BuildResult): Promise<PositionedFlow> {
  const vectorNodes = build.nodes.filter((n) => VECTOR_NODE_TYPES.has(n.type ?? ""));
  const vectorNodeIds = new Set(vectorNodes.map((n) => n.id));
  const vectorEdges = build.edges.filter(
    (e) => vectorNodeIds.has(e.source) && vectorNodeIds.has(e.target),
  );

  const elkGraph: ElkNode = {
    id: "vector-root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "90",
      "elk.spacing.nodeNode": "28",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.crossingMinimization.semiInteractive": "true",
    },
    children: vectorNodes.map((n) => {
      const d = dimsFor(n.type);
      return { id: n.id, width: d.w, height: d.h };
    }),
    edges: vectorEdges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };

  const laid = await elk.layout(elkGraph);
  const positions = new Map<string, { x: number; y: number; w: number; h: number }>();
  (laid.children || []).forEach((c) => {
    positions.set(c.id, {
      x: c.x ?? 0,
      y: c.y ?? 0,
      w: c.width ?? NODE_W,
      h: c.height ?? NODE_H,
    });
  });

  let vectorMaxY = 0;
  let vectorMinX = Number.POSITIVE_INFINITY;
  let vectorMaxX = Number.NEGATIVE_INFINITY;
  positions.forEach((p) => {
    vectorMaxY = Math.max(vectorMaxY, p.y + p.h);
    vectorMinX = Math.min(vectorMinX, p.x);
    vectorMaxX = Math.max(vectorMaxX, p.x + p.w);
  });
  if (!Number.isFinite(vectorMinX)) vectorMinX = 0;
  if (!Number.isFinite(vectorMaxX)) vectorMaxX = NODE_W;

  const responseRowY = VECTOR_ROW_Y + vectorMaxY + ROW_GAP;
  const lifecycleRowY = build.hasResponseNode
    ? responseRowY + RESPONSE_NODE_H + ROW_GAP
    : VECTOR_ROW_Y + vectorMaxY + ROW_GAP;

  const sequence = build.lifecycleSequence;
  const lifecycleSpan =
    sequence.length > 0 ? LIFECYCLE_SPACING * (sequence.length - 1) + STATUS_NODE_W : STATUS_NODE_W;
  const vectorSpan = Math.max(vectorMaxX - vectorMinX, STATUS_NODE_W);

  // Center the lifecycle row against the vector graph's horizontal extent.
  const lifecycleStartX = vectorMinX + (vectorSpan - lifecycleSpan) / 2;
  const lifecycleX = new Map<IncidentStatus, number>();
  sequence.forEach((status, idx) => {
    lifecycleX.set(status, lifecycleStartX + idx * LIFECYCLE_SPACING);
  });

  // Response node: centered on the same horizontal axis as the lifecycle row.
  const responseX = vectorMinX + (vectorSpan - RESPONSE_NODE_W) / 2;
  // Responder sits to the right of Response.
  const responderX = responseX + RESPONSE_NODE_W + RESPONDER_GAP;

  const positioned: Node<IncidentFlowNodeData>[] = build.nodes.map((node) => {
    if (VECTOR_NODE_TYPES.has(node.type ?? "")) {
      const p = positions.get(node.id);
      return {
        ...node,
        position: { x: p?.x ?? 0, y: VECTOR_ROW_Y + (p?.y ?? 0) },
      };
    }
    if (node.type === "response") {
      return { ...node, position: { x: responseX, y: responseRowY } };
    }
    if (node.type === "status") {
      const data = node.data as { status: IncidentStatus };
      const x = lifecycleX.get(data.status) ?? lifecycleStartX;
      return { ...node, position: { x, y: lifecycleRowY } };
    }
    if (node.type === "responder") {
      // Sit next to Response if it exists; otherwise tuck under the lifecycle row.
      if (build.hasResponseNode) {
        const responderY = responseRowY + (RESPONSE_NODE_H - 90) / 2;
        return { ...node, position: { x: responderX, y: responderY } };
      }
      const x = lifecycleStartX + lifecycleSpan + RESPONDER_GAP;
      return { ...node, position: { x, y: lifecycleRowY } };
    }
    return node;
  });

  // Silence unused-warning for RESPONDER_NODE_W if no responder is present.
  void RESPONDER_NODE_W;

  return { nodes: positioned, edges: build.edges };
}
