import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { MoreHorizontal } from "lucide-react";
import type { TargetOverflowNodeData } from "../types";

const TargetOverflowNodeImpl = ({ data }: NodeProps<{ data: TargetOverflowNodeData }>) => {
  const d = data as unknown as TargetOverflowNodeData;
  const [open, setOpen] = useState(false);
  return (
    <div className="relative w-[180px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-xl bg-card/60 backdrop-blur border border-dashed border-border px-3 py-2 text-left hover:bg-card/80 transition"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-muted/40 border border-border flex items-center justify-center shrink-0">
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              More Targets
            </div>
            <div className="text-sm font-semibold text-foreground tabular-nums">
              +{d.remaining}
            </div>
          </div>
        </div>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-full max-h-40 overflow-auto rounded-lg bg-popover border border-border p-2 space-y-1 shadow-xl z-50">
          {d.ips.map((ip) => (
            <div
              key={ip}
              className="text-[11px] font-mono tabular-nums text-foreground bg-secondary/40 px-2 py-1 rounded truncate"
            >
              {ip}
            </div>
          ))}
        </div>
      )}
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground !border-border" />
    </div>
  );
};

export const TargetOverflowNode = memo(TargetOverflowNodeImpl);
