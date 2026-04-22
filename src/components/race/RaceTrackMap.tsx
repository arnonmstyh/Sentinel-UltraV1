import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RaceResponder } from "@/lib/raceMetrics";

interface RaceTrackMapProps {
  responders: RaceResponder[];
}

const VIEW_W = 960;
const VIEW_H = 320;

const TRACK_D = `
  M 90 260
  L 560 260
  C 700 260, 780 210, 790 160
  C 800 90, 720 50, 630 60
  L 380 80
  C 290 90, 260 150, 290 190
  C 310 220, 240 230, 170 220
  C 110 210, 70 230, 90 260
  Z
`;

const SECTOR_TICKS = [
  { at: 0.34, label: "S2", color: "hsl(193 95% 55%)" },
  { at: 0.68, label: "S3", color: "hsl(292 84% 65%)" },
];

const RaceTrackMap = ({ responders }: RaceTrackMapProps) => {
  const pathRef = useRef<SVGPathElement>(null);
  const carRefs = useRef<Map<string, SVGGElement>>(new Map());
  const progressRef = useRef<Map<string, number>>(new Map());
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(performance.now());
  const respondersRef = useRef(responders);
  respondersRef.current = responders;

  const [startFinish, setStartFinish] = useState<{ x: number; y: number; angle: number } | null>(null);
  const [sectorMarks, setSectorMarks] = useState<Array<{ x: number; y: number; angle: number; color: string; label: string }>>([]);
  const [fastestName, setFastestName] = useState<string | null>(null);

  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    const p0 = path.getPointAtLength(0.001 * total);
    const p0b = path.getPointAtLength(0.003 * total);
    setStartFinish({
      x: p0.x,
      y: p0.y,
      angle: Math.atan2(p0b.y - p0.y, p0b.x - p0.x) * (180 / Math.PI),
    });

    setSectorMarks(
      SECTOR_TICKS.map((m) => {
        const p = path.getPointAtLength(m.at * total);
        const pAhead = path.getPointAtLength((m.at + 0.002) * total);
        return {
          x: p.x,
          y: p.y,
          angle: Math.atan2(pAhead.y - p.y, pAhead.x - p.x) * (180 / Math.PI),
          color: m.color,
          label: m.label,
        };
      }),
    );
  }, []);

  useEffect(() => {
    let bestName: string | null = null;
    let bestMs = Infinity;
    responders.forEach((r) => {
      if (r.bestResponseMs > 0 && r.bestResponseMs < bestMs) {
        bestMs = r.bestResponseMs;
        bestName = r.name;
      }
    });
    setFastestName(bestName);
  }, [responders]);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const totalLength = path.getTotalLength();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;

      const current = respondersRef.current;
      current.forEach((r, i) => {
        if (!progressRef.current.has(r.name)) {
          progressRef.current.set(r.name, (i / Math.max(1, current.length)) % 1);
        }
        const prev = progressRef.current.get(r.name) ?? 0;
        const lapDuration = Math.max(8, 60 - (r.score / 100) * 42);
        const speed = 1 / lapDuration;
        let nextP = prev + speed * dt;
        if (nextP >= 1) nextP -= 1;
        progressRef.current.set(r.name, nextP);

        const pt = path.getPointAtLength(nextP * totalLength);
        const el = carRefs.current.get(r.name);
        if (el) {
          el.setAttribute("transform", `translate(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)})`);
        }
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const names = new Set(responders.map((r) => r.name));
    for (const key of progressRef.current.keys()) {
      if (!names.has(key)) {
        progressRef.current.delete(key);
        carRefs.current.delete(key);
      }
    }
  }, [responders]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-border/60 bg-gradient-to-br from-[hsl(220_26%_10%)] via-[hsl(220_26%_6%)] to-[hsl(220_26%_3%)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Track Map
          </span>
          <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-widest text-primary">
            Live Animated
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            Car speed ∝ score · faster lap = higher rank
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.18em]">
          <span className="text-emerald-400/80">S1 · Resolved</span>
          <span className="text-cyan-400/80">S2 · Speed</span>
          <span className="text-fuchsia-400/80">S3 · Severity</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="grid-bg" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="hsl(220 20% 14%)" strokeWidth="0.4" />
          </pattern>
          <pattern id="curb" width="12" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
            <rect width="6" height="4" fill="#ef4444" />
            <rect x="6" width="6" height="4" fill="#ffffff" />
          </pattern>
          <radialGradient id="trackGlow">
            <stop offset="0%" stopColor="hsl(193 95% 55%)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="car-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={VIEW_W} height={VIEW_H} fill="url(#grid-bg)" />
        <ellipse cx={VIEW_W / 2} cy={VIEW_H / 2} rx={VIEW_W / 2} ry={VIEW_H / 1.3} fill="url(#trackGlow)" opacity="0.4" />

        <path d={TRACK_D} fill="none" stroke="hsl(220 20% 9%)" strokeWidth="34" strokeLinejoin="round" strokeLinecap="round" />
        <path d={TRACK_D} fill="none" stroke="hsl(220 20% 22%)" strokeWidth="36" strokeLinejoin="round" strokeLinecap="round" opacity="0.55" />
        <path d={TRACK_D} fill="none" stroke="hsl(220 20% 16%)" strokeWidth="30" strokeLinejoin="round" strokeLinecap="round" />
        <path ref={pathRef} d={TRACK_D} fill="none" stroke="transparent" strokeWidth="0" />
        <path d={TRACK_D} fill="none" stroke="hsl(220 20% 42%)" strokeWidth="1.25" strokeDasharray="4 8" opacity="0.75" />

        <text x="310" y="200" fill="hsl(142 76% 50%)" opacity="0.42" fontSize="11" fontFamily="ui-monospace, monospace" letterSpacing="2" fontWeight="900">
          SECTOR 1 · RESOLVED
        </text>
        <text x="555" y="150" fill="hsl(193 95% 60%)" opacity="0.42" fontSize="11" fontFamily="ui-monospace, monospace" letterSpacing="2" fontWeight="900">
          SECTOR 2 · SPEED
        </text>
        <text x="155" y="185" fill="hsl(292 84% 65%)" opacity="0.42" fontSize="11" fontFamily="ui-monospace, monospace" letterSpacing="2" fontWeight="900">
          SECTOR 3 · SEVERITY
        </text>

        <g transform="translate(700, 105)">
          <rect x="-40" y="-9" width="80" height="18" rx="3" fill="hsl(292 84% 40%)" opacity="0.9" />
          <text x="0" y="4" fontSize="9" fill="white" fontFamily="ui-monospace, monospace" textAnchor="middle" fontWeight="900" letterSpacing="2">
            SPEED TRAP
          </text>
        </g>

        {startFinish && (
          <g transform={`translate(${startFinish.x}, ${startFinish.y}) rotate(${startFinish.angle + 90})`}>
            <rect x="-15" y="-2" width="30" height="4" fill="url(#curb)" />
            <rect x="-17" y="-17" width="34" height="15" rx="2" fill="#000" opacity="0.85" />
            <text x="0" y="-7" fontSize="9" fill="white" fontFamily="ui-monospace, monospace" textAnchor="middle" fontWeight="900" letterSpacing="2">
              START
            </text>
          </g>
        )}

        {sectorMarks.map((m) => (
          <g key={m.label} transform={`translate(${m.x}, ${m.y}) rotate(${m.angle + 90})`}>
            <rect x="-14" y="-1.5" width="28" height="3" fill={m.color} opacity="0.9" />
            <text x="0" y="-6" fontSize="9" fill={m.color} fontFamily="ui-monospace, monospace" textAnchor="middle" fontWeight="900" letterSpacing="1.5">
              {m.label}
            </text>
          </g>
        ))}

        {responders.map((r, i) => {
          const isLeader = i === 0;
          const isFastest = r.name === fastestName && r.bestResponseMs > 0;
          return (
            <g
              key={r.name}
              ref={(el) => {
                if (el) carRefs.current.set(r.name, el);
                else carRefs.current.delete(r.name);
              }}
              style={{ willChange: "transform" }}
            >
              {isLeader && (
                <circle cx="0" cy="0" r="16" fill="hsl(193 95% 55%)" opacity="0.18" filter="url(#car-glow)">
                  <animate attributeName="r" values="14;19;14" dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.10;0.26;0.10" dur="1.6s" repeatCount="indefinite" />
                </circle>
              )}
              {isFastest && !isLeader && (
                <circle cx="0" cy="0" r="13" fill="hsl(292 84% 65%)" opacity="0.22" />
              )}
              <circle cx="0" cy="0" r="9" fill={r.teamColor} stroke="white" strokeWidth="2" />
              <circle cx="0" cy="0" r="3" fill="white" opacity="0.9" />

              <g transform="translate(13, -12)">
                <rect
                  x="0"
                  y="-9"
                  width={isLeader ? 38 : 32}
                  height="14"
                  rx="2"
                  fill={isLeader ? "white" : r.teamColor}
                  stroke={isLeader ? r.teamColor : "rgba(0,0,0,0.35)"}
                  strokeWidth={isLeader ? "1.5" : "0.5"}
                />
                <text
                  x={isLeader ? 19 : 16}
                  y="1"
                  fontSize="9.5"
                  fill={isLeader ? "black" : "white"}
                  fontFamily="ui-monospace, monospace"
                  textAnchor="middle"
                  fontWeight="900"
                  letterSpacing="1"
                >
                  {r.code}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default RaceTrackMap;
