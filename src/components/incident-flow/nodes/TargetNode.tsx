import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Target } from "lucide-react";
import { getSeverityRing } from "../severity";
import type { TargetNodeData } from "../types";

const TargetNodeImpl = ({ data }: NodeProps<{ data: TargetNodeData }>) => {
  const d = data as unknown as TargetNodeData;
  return (
    <div
      className={`w-[180px] rounded-xl bg-card/80 backdrop-blur border border-border ring-1 ${getSeverityRing(
        d.severity,
      )} px-3 py-2 shadow-md shadow-black/20`}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
          <Target className="w-4 h-4 text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Victim Asset
          </div>
          <div className="text-sm font-mono font-semibold text-foreground tabular-nums truncate">
            {d.ip}
          </div>
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-blue-400 !border-blue-300" />
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !border-border" />
    </div>
  );
};

export const TargetNode = memo(TargetNodeImpl);
