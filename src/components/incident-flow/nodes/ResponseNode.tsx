import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Shield, ShieldCheck, ShieldX, Timer } from "lucide-react";
import type { ResponseNodeData } from "../types";

const ResponseNodeImpl = ({ data }: NodeProps<{ data: ResponseNodeData }>) => {
  const d = data as unknown as ResponseNodeData;
  const blocked = d.responseStatus === "responded";
  return (
    <div
      className={`w-[220px] rounded-xl bg-card/85 backdrop-blur border border-border ring-2 px-3 py-2.5 shadow-lg shadow-black/20 ${
        blocked ? "ring-green-500/50" : "ring-amber-500/50"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
            blocked ? "bg-green-500/15 border-green-500/30" : "bg-amber-500/15 border-amber-500/30"
          }`}
        >
          <Shield className={`w-4 h-4 ${blocked ? "text-green-400" : "text-amber-400"}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Response
          </div>
          <div className="text-[11px] text-foreground/80">Containment phase</div>
        </div>
      </div>
      <div className="space-y-1 text-[11px]">
        {d.responseTime && (
          <div className="flex items-center gap-1.5 tabular-nums">
            <Timer className="w-3 h-3 shrink-0 text-muted-foreground" />
            <span className="text-foreground/80">Time</span>
            <span className="ml-auto text-foreground truncate max-w-[130px]">{d.responseTime}</span>
          </div>
        )}
        {d.responseStatus && (
          <div className="flex items-center gap-1.5">
            {blocked ? (
              <ShieldCheck className="w-3 h-3 shrink-0 text-green-400" />
            ) : (
              <ShieldX className="w-3 h-3 shrink-0 text-amber-400" />
            )}
            <span className="text-foreground/80">Action</span>
            <span
              className={`ml-auto font-semibold ${blocked ? "text-green-400" : "text-amber-400"}`}
            >
              {blocked ? "Blocked" : "Pending"}
            </span>
          </div>
        )}
        {!d.responseTime && !d.responseStatus && (
          <div className="text-muted-foreground italic text-[11px]">No response data yet</div>
        )}
      </div>
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !border-border" />
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !border-border" />
      <Handle type="target" position={Position.Right} id="responder-out" className="!bg-muted-foreground !border-border" />
    </div>
  );
};

export const ResponseNode = memo(ResponseNodeImpl);
