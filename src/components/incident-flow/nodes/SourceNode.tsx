import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertTriangle, Globe2 } from "lucide-react";
import { getSeverityFill, getSeverityRing } from "../severity";
import type { SourceNodeData } from "../types";

const SourceNodeImpl = ({ data }: NodeProps<{ data: SourceNodeData }>) => {
  const d = data as unknown as SourceNodeData;
  return (
    <div
      className={`w-[200px] rounded-xl bg-card/80 backdrop-blur border border-border ring-2 ${getSeverityRing(
        d.severity,
      )} shadow-lg shadow-black/20 px-3 py-2.5`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-2 h-2 rounded-full ${getSeverityFill(d.severity)} animate-pulse`} />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          Attacker Source
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-mono font-semibold text-foreground tabular-nums truncate">
            {d.ip || "Unknown"}
          </div>
          {d.country && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
              <Globe2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{d.country}</span>
            </div>
          )}
        </div>
      </div>
      <Handle type="target" id="left-in" position={Position.Left} className="!bg-red-500 !border-red-300" />
      <Handle type="source" id="right" position={Position.Right} className="!bg-red-500 !border-red-300" />
      <Handle type="source" id="bottom" position={Position.Bottom} className="!bg-red-500 !border-red-300" />
    </div>
  );
};

export const SourceNode = memo(SourceNodeImpl);
