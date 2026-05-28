import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Globe2 } from "lucide-react";
import type { CountryNodeData } from "../types";

const CountryNodeImpl = ({ data }: NodeProps<{ data: CountryNodeData }>) => {
  const d = data as unknown as CountryNodeData;
  return (
    <div className="w-[160px] rounded-xl bg-card/80 backdrop-blur border border-border px-3 py-2.5 shadow-md shadow-black/20">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          Geo Origin
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
          <Globe2 className="w-4 h-4 text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground truncate">{d.country}</div>
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground !border-border" />
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground !border-border" />
    </div>
  );
};

export const CountryNode = memo(CountryNodeImpl);
