import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Radar, Clock } from "lucide-react";
import { format } from "date-fns";
import type { DetectionNodeData } from "../types";

const DetectionNodeImpl = ({ data }: NodeProps<{ data: DetectionNodeData }>) => {
  const d = data as unknown as DetectionNodeData;
  return (
    <div className="w-[200px] rounded-xl bg-card/85 backdrop-blur border border-border ring-1 ring-cyan-500/50 shadow-md shadow-black/20 px-3 py-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
          <Radar className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Detection
          </div>
          <div className="text-[11px] text-foreground/80">First observed</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-foreground tabular-nums">
        <Clock className="w-3 h-3 shrink-0 text-cyan-400" />
        {format(d.createdAt, "MMM dd, yyyy HH:mm:ss")}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-cyan-400 !border-cyan-300" />
    </div>
  );
};

export const DetectionNode = memo(DetectionNodeImpl);
