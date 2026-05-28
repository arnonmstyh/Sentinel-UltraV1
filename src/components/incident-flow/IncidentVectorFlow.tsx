import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock,
  Globe2,
  MoreHorizontal,
  MousePointerClick,
  Network,
  Radar,
  Search,
  Shield,
  ShieldCheck,
  ShieldX,
  Target,
  Timer,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Incident } from "@/types/incident";
import { buildIncidentFlow } from "./buildIncidentFlow";
import { layoutIncidentFlow } from "./layoutWithElk";
import { isDangerous } from "./severity";
import { DetectionNode } from "./nodes/DetectionNode";
import { SourceNode } from "./nodes/SourceNode";
import { CountryNode } from "./nodes/CountryNode";
import { TargetNode } from "./nodes/TargetNode";
import { TargetOverflowNode } from "./nodes/TargetOverflowNode";
import { ResponseNode } from "./nodes/ResponseNode";
import { StatusNode } from "./nodes/StatusNode";
import { ResponderNode } from "./nodes/ResponderNode";
import type {
  CountryNodeData,
  DetectionNodeData,
  IncidentFlowNodeData,
  ResponderNodeData,
  ResponseNodeData,
  SourceNodeData,
  StatusNodeData,
  TargetNodeData,
  TargetOverflowNodeData,
} from "./types";

const nodeTypes = {
  detection: DetectionNode,
  source: SourceNode,
  country: CountryNode,
  target: TargetNode,
  "target-overflow": TargetOverflowNode,
  response: ResponseNode,
  status: StatusNode,
  responder: ResponderNode,
} as const;

interface LegendItem {
  icon: typeof AlertTriangle;
  label: string;
  tint: string;
}

const LEGEND: LegendItem[] = [
  { icon: Radar, label: "Detection", tint: "text-cyan-400" },
  { icon: AlertTriangle, label: "Attacker source", tint: "text-red-400" },
  { icon: Globe2, label: "Geo origin", tint: "text-blue-400" },
  { icon: Target, label: "Victim asset", tint: "text-blue-400" },
  { icon: MoreHorizontal, label: "More targets", tint: "text-muted-foreground" },
  { icon: Shield, label: "Response phase", tint: "text-green-400" },
  { icon: ShieldCheck, label: "Responder", tint: "text-primary" },
  { icon: AlertCircle, label: "Open", tint: "text-red-400" },
  { icon: Search, label: "Investigating", tint: "text-yellow-400" },
  { icon: CheckCircle2, label: "Resolved", tint: "text-green-400" },
  { icon: Archive, label: "Closed", tint: "text-gray-400" },
];

interface IncidentVectorFlowProps {
  incident: Incident;
}

const IncidentVectorFlowInner = ({ incident }: IncidentVectorFlowProps) => {
  const [nodes, setNodes] = useState<Node<IncidentFlowNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dangerous = isDangerous(incident.severity);
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  const build = useMemo(() => buildIncidentFlow(incident), [incident]);

  useEffect(() => {
    let cancelled = false;
    setSelectedId(null);
    layoutIncidentFlow(build)
      .then((positioned) => {
        if (cancelled) return;
        setNodes(positioned.nodes);
        setEdges(positioned.edges);
      })
      .catch((err) => {
        console.error("[IncidentVectorFlow] layout failed", err);
        if (!cancelled) {
          setNodes([]);
          setEdges([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [build]);

  // React Flow measures each node after render. Once it reports all of them as
  // initialised, fit the freshly-positioned graph into the viewport.
  useEffect(() => {
    if (!nodesInitialized || nodes.length === 0) return;
    const handle = requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: 300, includeHiddenNodes: false });
    });
    return () => cancelAnimationFrame(handle);
  }, [nodesInitialized, nodes.length, incident.id, fitView]);

  const onNodeClick = useCallback((_: unknown, node: Node<IncidentFlowNodeData>) => {
    setSelectedId((cur) => (cur === node.id ? null : node.id));
  }, []);

  const onPaneClick = useCallback(() => setSelectedId(null), []);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds) as Node<IncidentFlowNodeData>[]);
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  return (
    <Card className="bg-gradient-card border-border overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5 text-primary" />
              Incident Vector Flow
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <MousePointerClick className="w-3 h-3" />
              Drag to pan · Scroll or pinch to zoom · Click a node for details
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dangerous && (
              <Badge className="bg-red-500/15 text-red-400 border-red-500/40 border">
                Active attack path
              </Badge>
            )}
            <Badge variant="outline" className="text-[11px] tabular-nums">
              {(incident.destinationIPs?.length ?? 0)} target
              {(incident.destinationIPs?.length ?? 0) === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="h-[560px] w-full"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.18, includeHiddenNodes: false }}
            style={{ background: "transparent" }}
            minZoom={0.4}
            maxZoom={2}
            panOnDrag
            panOnScroll={false}
            zoomOnScroll
            zoomOnPinch
            zoomOnDoubleClick={false}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            selectNodesOnDrag={false}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} className="opacity-50" />
            <Controls showInteractive={false} className="!bg-card/80 !border-border" />
          </ReactFlow>
        </motion.div>
        <div className="border-t border-border bg-secondary/20 px-4 py-3">
          {selectedNode ? (
            <NodeDetailPanel
              incident={incident}
              node={selectedNode}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <LegendStrip />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const LegendStrip = () => (
  <div>
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1.5">
      Legend
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {LEGEND.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex items-center gap-1.5">
            <Icon className={`w-3.5 h-3.5 ${item.tint}`} />
            <span className="text-[11px] text-foreground/90">{item.label}</span>
          </div>
        );
      })}
    </div>
  </div>
);

const NodeDetailPanel = ({
  incident,
  node,
  onClose,
}: {
  incident: Incident;
  node: Node<IncidentFlowNodeData>;
  onClose: () => void;
}) => {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0">{renderDetail(incident, node)}</div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground"
        onClick={onClose}
        aria-label="Close detail"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

const KV = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-baseline gap-2 text-[12px]">
    <span className="text-muted-foreground uppercase tracking-widest text-[10px] font-semibold w-24 shrink-0">
      {label}
    </span>
    <span className="text-foreground tabular-nums break-all">{value}</span>
  </div>
);

const PanelHeader = ({
  icon: Icon,
  label,
  tint,
}: {
  icon: typeof AlertTriangle;
  label: string;
  tint: string;
}) => (
  <div className="flex items-center gap-2 mb-1.5">
    <Icon className={`w-4 h-4 ${tint}`} />
    <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
      {label}
    </span>
  </div>
);

function renderDetail(incident: Incident, node: Node<IncidentFlowNodeData>): React.ReactNode {
  const data = node.data as IncidentFlowNodeData;
  switch (data.kind) {
    case "detection": {
      const d = data as DetectionNodeData;
      return (
        <div>
          <PanelHeader icon={Radar} label="Detection" tint="text-cyan-400" />
          <div className="space-y-1">
            <KV
              label="First seen"
              value={
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  {format(d.createdAt, "MMM dd, yyyy 'at' HH:mm:ss")}
                </span>
              }
            />
            <KV label="Incident" value={<span className="font-mono">{incident.id}</span>} />
            <KV label="Title" value={incident.title || "—"} />
          </div>
        </div>
      );
    }
    case "response": {
      const d = data as ResponseNodeData;
      const blocked = d.responseStatus === "responded";
      return (
        <div>
          <PanelHeader
            icon={Shield}
            label="Response Phase"
            tint={blocked ? "text-green-400" : "text-amber-400"}
          />
          <div className="space-y-1">
            {d.responseTime ? (
              <KV
                label="Response time"
                value={
                  <span className="inline-flex items-center gap-1">
                    <Timer className="w-3 h-3 text-muted-foreground" />
                    {d.responseTime}
                  </span>
                }
              />
            ) : (
              <KV label="Response time" value={<span className="text-muted-foreground">not recorded</span>} />
            )}
            {d.responseStatus ? (
              <KV
                label="Action"
                value={
                  <span
                    className={`inline-flex items-center gap-1 ${
                      blocked ? "text-green-400" : "text-amber-400"
                    }`}
                  >
                    {blocked ? (
                      <ShieldCheck className="w-3 h-3" />
                    ) : (
                      <ShieldX className="w-3 h-3" />
                    )}
                    {blocked ? "Blocked / Responded" : "Pending"}
                  </span>
                }
              />
            ) : (
              <KV label="Action" value={<span className="text-muted-foreground">not recorded</span>} />
            )}
          </div>
        </div>
      );
    }
    case "source": {
      const d = data as SourceNodeData;
      return (
        <div>
          <PanelHeader icon={AlertTriangle} label="Attacker Source" tint="text-red-400" />
          <div className="space-y-1">
            <KV label="IP" value={d.ip} />
            {d.country && <KV label="Country" value={d.country} />}
            <KV label="Severity" value={<span className="capitalize">{d.severity}</span>} />
          </div>
        </div>
      );
    }
    case "country": {
      const d = data as CountryNodeData;
      return (
        <div>
          <PanelHeader icon={Globe2} label="Geographic Origin" tint="text-blue-400" />
          <div className="space-y-1">
            <KV label="Country" value={d.country} />
          </div>
        </div>
      );
    }
    case "target": {
      const d = data as TargetNodeData;
      return (
        <div>
          <PanelHeader icon={Target} label="Victim Asset" tint="text-blue-400" />
          <div className="space-y-1">
            <KV label="IP" value={d.ip} />
            <KV label="Severity" value={<span className="capitalize">{d.severity}</span>} />
          </div>
        </div>
      );
    }
    case "target-overflow": {
      const d = data as TargetOverflowNodeData;
      return (
        <div>
          <PanelHeader icon={MoreHorizontal} label="Additional Targets" tint="text-muted-foreground" />
          <div className="text-[11px] text-muted-foreground mb-1.5">
            {d.remaining} more target IP{d.remaining === 1 ? "" : "s"}:
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-auto">
            {d.ips.map((ip) => (
              <span
                key={ip}
                className="text-[11px] font-mono tabular-nums text-foreground bg-secondary/40 border border-border px-1.5 py-0.5 rounded"
              >
                {ip}
              </span>
            ))}
          </div>
        </div>
      );
    }
    case "status": {
      const d = data as StatusNodeData;
      const Icon =
        d.status === "open"
          ? AlertCircle
          : d.status === "investigating"
          ? Search
          : d.status === "resolved"
          ? CheckCircle2
          : Archive;
      const tint =
        d.status === "open"
          ? "text-red-400"
          : d.status === "investigating"
          ? "text-yellow-400"
          : d.status === "resolved"
          ? "text-green-400"
          : "text-gray-400";
      return (
        <div>
          <PanelHeader icon={Icon} label={`Lifecycle: ${d.status}`} tint={tint} />
          <div className="space-y-1">
            <KV label="Reached" value={d.reached ? "Yes" : "Pending"} />
            {d.current && <KV label="Current" value="This is the current state" />}
            {d.reached && d.timestamp && (
              <KV label="When" value={format(d.timestamp, "MMM dd, yyyy 'at' HH:mm:ss")} />
            )}
            {d.reached && d.actor && <KV label="By" value={d.actor} />}
          </div>
        </div>
      );
    }
    case "responder": {
      const d = data as ResponderNodeData;
      return (
        <div>
          <PanelHeader icon={ShieldCheck} label="Assigned Responder" tint="text-primary" />
          <div className="space-y-1">
            <KV
              label="Name"
              value={
                <span className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-white"
                    style={{ backgroundColor: d.color }}
                  >
                    {d.code}
                  </span>
                  {d.name}
                </span>
              }
            />
            {d.responseTime && <KV label="Response" value={d.responseTime} />}
            <KV
              label="Status"
              value={
                <span className={d.responded ? "text-green-400" : "text-red-400"}>
                  {d.responded ? "Blocked / Responded" : "Pending"}
                </span>
              }
            />
            {incident.responseStatus && incident.responseStatus !== (d.responded ? "responded" : "pending") && (
              <KV label="Backend" value={incident.responseStatus} />
            )}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

const IncidentVectorFlow = (props: IncidentVectorFlowProps) => (
  <ReactFlowProvider>
    <IncidentVectorFlowInner {...props} />
  </ReactFlowProvider>
);

export default IncidentVectorFlow;
