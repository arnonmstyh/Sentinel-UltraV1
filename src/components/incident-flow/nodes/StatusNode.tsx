import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertCircle, Archive, CheckCircle2, Clock, Search } from "lucide-react";
import { format } from "date-fns";
import { getStatusBadge, getStatusFill } from "../severity";
import type { StatusNodeData } from "../types";
import type { IncidentStatus } from "@/types/incident";

const STATUS_ICON: Record<IncidentStatus, typeof AlertCircle> = {
  open: AlertCircle,
  investigating: Search,
  resolved: CheckCircle2,
  closed: Archive,
};

const STATUS_ICON_TINT: Record<IncidentStatus, string> = {
  open: "text-red-400",
  investigating: "text-yellow-400",
  resolved: "text-green-400",
  closed: "text-gray-400",
};

const StatusNodeImpl = ({ data }: NodeProps<{ data: StatusNodeData }>) => {
  const d = data as unknown as StatusNodeData;
  const Icon = STATUS_ICON[d.status];
  const future = !d.reached;
  return (
    <div
      className={`w-[180px] rounded-xl bg-card/85 backdrop-blur border px-3 py-2.5 shadow-md shadow-black/20 transition ${
        future ? "border-border/70" : "border-border"
      } ${d.current ? "ring-2 ring-primary/60" : ""}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
            future ? "bg-muted/40 border-border" : "bg-card border-border"
          }`}
        >
          <Icon className={`w-4 h-4 ${future ? "text-muted-foreground" : STATUS_ICON_TINT[d.status]}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Lifecycle
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${getStatusFill(d.status)} ${
                d.current ? "animate-pulse" : ""
              }`}
            />
            <span
              className={`text-[10px] uppercase tracking-widest font-semibold border px-1.5 py-0.5 rounded ${getStatusBadge(
                d.status,
              )}`}
            >
              {d.status}
            </span>
          </div>
        </div>
      </div>
      {d.reached ? (
        <>
          {d.timestamp && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
              <Clock className="w-3 h-3 shrink-0" />
              {format(d.timestamp, "HH:mm:ss")}
            </div>
          )}
          {d.actor && (
            <div className="text-[11px] text-foreground/80 mt-0.5 truncate">{d.actor}</div>
          )}
        </>
      ) : (
        <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
          Pending
        </div>
      )}
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground !border-border" />
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground !border-border" />
      <Handle type="target" position={Position.Top} id="top" className="!bg-muted-foreground !border-border" />
      <Handle type="target" position={Position.Bottom} id="bottom" className="!bg-muted-foreground !border-border" />
    </div>
  );
};

export const StatusNode = memo(StatusNodeImpl);
