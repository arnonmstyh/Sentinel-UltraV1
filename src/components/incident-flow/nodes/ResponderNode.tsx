import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Timer } from "lucide-react";
import type { ResponderNodeData } from "../types";

const ResponderNodeImpl = ({ data }: NodeProps<{ data: ResponderNodeData }>) => {
  const d = data as unknown as ResponderNodeData;
  return (
    <div
      className="w-[200px] rounded-xl bg-card/80 backdrop-blur border border-border px-3 py-2.5 shadow-lg shadow-black/20 relative"
      style={{ boxShadow: `0 0 0 2px ${d.color}33, 0 8px 24px rgba(0,0,0,0.25)` }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          Responder
        </span>
        {d.responded && (
          <span className="text-[9px] uppercase tracking-widest text-green-400 border border-green-500/40 bg-green-500/10 rounded px-1 py-px font-semibold">
            Blocked
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold tabular-nums text-white shrink-0"
          style={{ backgroundColor: d.color }}
        >
          {d.code}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground truncate">{d.name}</div>
          {d.responseTime && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 tabular-nums">
              <Timer className="w-3 h-3 shrink-0" />
              {d.responseTime}
            </div>
          )}
        </div>
      </div>
      <Handle type="source" id="left" position={Position.Left} className="!bg-muted-foreground !border-border" />
      <Handle type="source" id="top" position={Position.Top} className="!bg-muted-foreground !border-border" />
    </div>
  );
};

export const ResponderNode = memo(ResponderNodeImpl);
