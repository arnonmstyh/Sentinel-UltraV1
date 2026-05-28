import { useEffect, useMemo, useRef, useState, PointerEvent } from "react";
import { geoOrthographic, geoPath, geoInterpolate, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import worldTopo from "world-atlas/countries-110m.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Maximize2, Minimize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useIncidents } from "@/context/useIncidents";
import ExecutiveSummary from "./ExecutiveSummary";

const THAILAND: [number, number] = [100.9925, 15.87];

const COUNTRY_TO_LNGLAT: Record<string, [number, number]> = {
  China: [104.1954, 35.8617],
  "United States of America": [-95.7129, 37.0902],
  "Russian Federation": [37.6173, 55.7558],
  Vietnam: [108.2772, 14.0583],
  Indonesia: [113.9213, -0.7893],
  Netherlands: [4.9041, 52.3676],
  "Iran, Islamic Republic of": [53.688, 32.4279],
  "Syrian Arab Republic": [38.9968, 34.8021],
  "Czech Republic": [15.473, 49.8175],
  "Korea, Republic of": [127.7669, 35.9078],
  "Korea, Democratic People's Republic of": [127.5101, 40.3399],
  "Lao People's Democratic Republic": [102.4955, 19.8563],
  Burma: [95.956, 21.9162],
  Cambodia: [104.991, 12.5657],
  Bangladesh: [90.3563, 23.685],
  India: [78.9629, 20.5937],
  Brazil: [-51.9253, -14.235],
  Germany: [10.4515, 51.1657],
  France: [2.2137, 46.2276],
  "United Kingdom": [-3.436, 55.3781],
  Japan: [138.2529, 36.2048],
  Australia: [133.7751, -25.2744],
  Turkey: [35.2433, 38.9637],
  Ukraine: [31.1656, 48.3794],
  Mexico: [-102.5528, 23.6345],
  Canada: [-106.3468, 56.1304],
  Pakistan: [69.3451, 30.3753],
  Egypt: [30.8025, 26.8206],
  "South Africa": [22.9375, -30.5595],
  Nigeria: [8.6753, 9.082],
};

const normalizeCountryName = (name: string): string => {
  const n = (name || "").trim();
  const map: Record<string, string> = {
    "United States": "United States of America",
    USA: "United States of America",
    "U.S.A.": "United States of America",
    Russia: "Russian Federation",
    Iran: "Iran, Islamic Republic of",
    Syria: "Syrian Arab Republic",
    "Viet Nam": "Vietnam",
    Czechia: "Czech Republic",
    "South Korea": "Korea, Republic of",
    "North Korea": "Korea, Democratic People's Republic of",
    Laos: "Lao People's Democratic Republic",
    Myanmar: "Burma",
    BD: "Bangladesh",
    BANGLADESH: "Bangladesh",
  };
  if (map[n]) return map[n];
  const lower = n.toLowerCase();
  if (lower.includes("china")) return "China";
  if (lower.includes("indonesia")) return "Indonesia";
  if (lower.includes("thailand")) return "Thailand";
  if (lower.includes("netherlands")) return "Netherlands";
  if (lower.includes("united states")) return "United States of America";
  if (lower.includes("russia")) return "Russian Federation";
  if (lower.includes("korea") && lower.includes("democratic"))
    return "Korea, Democratic People's Republic of";
  if (lower.includes("korea")) return "Korea, Republic of";
  if (lower.includes("cambodia") || lower.includes("khmer")) return "Cambodia";
  if (lower.includes("bangladesh") || lower === "bd") return "Bangladesh";
  return n;
};

const severityWeight = (sev: string) =>
  sev === "critical" ? 1 : sev === "high" ? 0.8 : sev === "medium" ? 0.4 : 0.1;

const severityColor = (sev: string) => {
  switch (sev) {
    case "critical":
      return "#ef4444";
    case "high":
      return "#f97316";
    case "medium":
      return "#f59e0b";
    case "low":
      return "#84cc16";
    default:
      return "#3b82f6";
  }
};

const useReducedMotion = () => {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(m.matches);
    const onChange = () => setReduce(m.matches);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);
  return reduce;
};

// Bundle TopoJSON → GeoJSON once at module load.
const WORLD_FEATURES = (() => {
  const fc = feature(
    worldTopo as unknown as Parameters<typeof feature>[0],
    (worldTopo as unknown as { objects: { countries: Parameters<typeof feature>[1] } })
      .objects.countries
  ) as unknown as GeoJSON.FeatureCollection;
  return fc.features;
})();

const SIZE = 420;
const CENTER = SIZE / 2;
const RADIUS_BASE = 195;
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 3.5;

const ThreatMap = () => {
  const { incidents } = useIncidents();
  const reduceMotion = useReducedMotion();

  // Time/rotation state
  const [tick, setTick] = useState(0);
  const [userLambda, setUserLambda] = useState(-100);
  const [userPhi, setUserPhi] = useState(-15);
  const [zoom, setZoom] = useState(1);

  // Globe geometry is fixed; zoom is applied via CSS transform on the wrapper so the
  // whole globe + whirl rings dolly closer/farther as one unit (professional camera-zoom feel).
  const RADIUS = RADIUS_BASE;
  const SCALE = RADIUS_BASE;
  const startRef = useRef(performance.now());
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef<{ x: number; y: number; l: number; p: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Native fullscreen for the map container
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fsScale, setFsScale] = useState(1);

  const toggleFullscreen = () => {
    if (document.fullscreenElement === containerRef.current) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      const active = document.fullscreenElement === containerRef.current;
      setIsFullscreen(active);
      // Enlarge the globe to fill the screen (500 = whirl-ring footprint)
      setFsScale(active ? (Math.min(window.innerWidth, window.innerHeight) * 0.9) / 500 : 1);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Wheel-zoom — non-passive listener so we can preventDefault and avoid page scroll
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => {
        const next = z * (e.deltaY > 0 ? 0.88 : 1.14);
        return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const zoomBy = (factor: number) =>
    setZoom((z) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z * factor)));
  const resetView = () => {
    setZoom(1);
    setUserLambda(-100);
    setUserPhi(-15);
  };

  // Hover tooltip
  const [hover, setHover] = useState<{
    name: string;
    count: number;
    weight: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (reduceMotion) return;
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      if (now - last >= 33) {
        setTick(now - startRef.current);
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  // Auto-rotation pauses while dragging or hovering a country
  const autoLambda = useMemo(() => {
    if (dragging || hover) return 0;
    return (tick / 1000) * 9;
  }, [tick, dragging, hover]);

  const lambda = userLambda + autoLambda;
  const phi = userPhi;

  const projection = useMemo(
    () =>
      geoOrthographic()
        .scale(SCALE)
        .translate([CENTER, CENTER])
        .rotate([lambda, phi, 0])
        .clipAngle(90),
    [lambda, phi, SCALE]
  );

  const pathGen = useMemo(() => geoPath(projection), [projection]);

  const countryWeights = useMemo(() => {
    const acc: Record<string, number> = {};
    incidents.forEach((i) => {
      const c = normalizeCountryName(i.country || "");
      if (!c) return;
      acc[c] = (acc[c] || 0) + severityWeight(i.severity);
    });
    return acc;
  }, [incidents]);

  const countryIncidentCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    incidents.forEach((i) => {
      const c = normalizeCountryName(i.country || "");
      if (!c) return;
      acc[c] = (acc[c] || 0) + 1;
    });
    return acc;
  }, [incidents]);

  const maxWeight = useMemo(
    () => Math.max(1, ...Object.values(countryWeights)),
    [countryWeights]
  );

  const topSources = useMemo(
    () =>
      Object.entries(countryWeights)
        .filter(([n]) => n !== "Thailand")
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([n]) => n),
    [countryWeights]
  );

  const sources = useMemo<[number, number][]>(() => {
    const ranked = Object.entries(countryWeights)
      .filter(([n]) => n !== "Thailand")
      .sort(([, a], [, b]) => b - a)
      .map(([n]) => COUNTRY_TO_LNGLAT[n])
      .filter(Boolean) as [number, number][];
    if (ranked.length > 0) return ranked;
    return [
      [104.1954, 35.8617],
      [-95.7129, 37.0902],
      [37.6173, 55.7558],
      [108.2772, 14.0583],
      [113.9213, -0.7893],
      [10.4515, 51.1657],
    ];
  }, [countryWeights]);

  const trails = useMemo(() => {
    const out: { d: string; opacity: number; key: string }[] = [];
    for (let i = 0; i < 5; i++) {
      const trailElapsed = tick - i * 550;
      if (trailElapsed < 0) continue;
      const cycle = 2400;
      const cycleIndex = Math.floor(trailElapsed / cycle);
      const progress = (trailElapsed % cycle) / cycle;
      const source = sources[(i + cycleIndex * 7) % sources.length];
      if (!source) continue;
      const interp = geoInterpolate(source, THAILAND);
      const steps = 56;
      const head = Math.min(progress * 1.5, 1);
      const tail = Math.max(head - 0.34, 0);
      const pts: [number, number][] = [];
      for (let s = 0; s <= steps; s++) {
        const t = tail + (s / steps) * (head - tail);
        const p = projection(interp(t));
        if (p) pts.push(p);
      }
      if (pts.length < 2) continue;
      const d =
        "M" + pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join("L");
      const opacity =
        progress < 0.72 ? 0.85 : 0.85 * (1 - (progress - 0.72) / 0.28);
      out.push({ d, opacity, key: `${i}-${cycleIndex}` });
    }
    return out;
  }, [tick, sources, projection]);

  const countryPaths = useMemo(() => {
    return WORLD_FEATURES.map((f, idx) => {
      const d = pathGen(f);
      if (!d) return null;
      const raw = (f.properties as { name?: string } | null)?.name || "";
      const name = normalizeCountryName(raw);
      const weight = countryWeights[name] || 0;
      const count = countryIncidentCounts[name] || 0;
      const ratio = Math.min(1, weight / maxWeight);
      const key = (f.id as string | undefined) ?? raw ?? idx;
      return { d, key, name, raw, weight, count, ratio };
    }).filter(
      (
        x
      ): x is {
        d: string;
        key: string | number;
        name: string;
        raw: string;
        weight: number;
        count: number;
        ratio: number;
      } => x !== null
    );
  }, [pathGen, countryWeights, countryIncidentCounts, maxWeight]);

  const graticuleD = useMemo(() => pathGen(geoGraticule10()) ?? "", [pathGen]);
  const sphereD = useMemo(() => pathGen({ type: "Sphere" }) ?? "", [pathGen]);

  const thailandPoint = projection(THAILAND);

  // Drag handlers
  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (hover) return; // let country hover take precedence
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setDragging(true);
    setUserLambda((l) => l + autoLambda); // anchor: bake current auto into user offset
    dragOrigin.current = {
      x: e.clientX,
      y: e.clientY,
      l: userLambda + autoLambda,
      p: userPhi,
    };
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current || !dragOrigin.current) return;
    const dx = e.clientX - dragOrigin.current.x;
    const dy = e.clientY - dragOrigin.current.y;
    const sens = 0.45 / zoom; // drag feels right at any zoom — bigger globe rotates less per pixel
    setUserLambda(dragOrigin.current.l + dx * sens);
    setUserPhi(
      Math.max(-85, Math.min(85, dragOrigin.current.p - dy * sens))
    );
  };

  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current) return;
    (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
    draggingRef.current = false;
    setDragging(false);
    dragOrigin.current = null;
    startRef.current = performance.now() - 0; // reset auto-lambda baseline
    setTick(0);
  };

  return (
    <Card className="bg-gradient-card border-border h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Global Threat Map
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-normal border-border/60">
            {incidents.length} active
          </Badge>
          {topSources.length > 0 && (
            <Badge variant="outline" className="text-xs font-normal border-border/60">
              Top: {topSources.slice(0, 2).join(", ")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div
          ref={containerRef}
          className={`relative w-full ${isFullscreen ? "h-screen" : "h-[460px]"} rounded-lg overflow-hidden border border-border/40`}
          style={{
            background:
              "radial-gradient(ellipse at center, #0d1830 0%, #07101f 60%, #050a14 100%)",
          }}
        >
          {/* Globe + whirl scale together via CSS transform — "camera zoom" feel */}
          <div
            className="absolute inset-0"
            style={{
              transform: `scale(${zoom * fsScale})`,
              transformOrigin: "center center",
              transition: dragging ? "none" : "transform 140ms ease-out",
            }}
          >
          {/* Whirl rings */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 500 500"
              width={500}
              height={500}
              className={reduceMotion ? "" : "animate-whirl-ccw"}
            >
              <circle
                cx="250"
                cy="250"
                r="240"
                fill="none"
                stroke="#22d3ee"
                strokeOpacity="0.12"
                strokeWidth="0.8"
              />
              <circle
                cx="250"
                cy="250"
                r="235"
                fill="none"
                stroke="#22d3ee"
                strokeOpacity="0.35"
                strokeWidth="0.9"
                strokeDasharray="30 18"
              />
              <circle
                cx="250"
                cy="250"
                r="235"
                fill="none"
                stroke="#67e8f9"
                strokeOpacity="0.9"
                strokeWidth="2"
                strokeDasharray="3 1473"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 460 460"
              width={460}
              height={460}
              className={reduceMotion ? "" : "animate-whirl-cw"}
            >
              <circle
                cx="230"
                cy="230"
                r="220"
                fill="none"
                stroke="#22d3ee"
                strokeOpacity="0.45"
                strokeWidth="0.6"
                strokeDasharray="3 9"
              />
            </svg>
          </div>

          {/* Globe */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              width={SIZE}
              height={SIZE}
              style={{
                cursor: dragging ? "grabbing" : "grab",
                filter: "drop-shadow(0 0 24px rgba(34,211,238,0.15))",
                touchAction: "none",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              <defs>
                <radialGradient id="globe-face" cx="38%" cy="32%" r="78%">
                  <stop offset="0%" stopColor="#1e3a5f" />
                  <stop offset="55%" stopColor="#0e2240" />
                  <stop offset="100%" stopColor="#040a18" />
                </radialGradient>
                <radialGradient id="globe-vignette" cx="50%" cy="50%" r="50%">
                  <stop offset="72%" stopColor="#000000" stopOpacity="0" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
                </radialGradient>
                <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="1.4" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <clipPath id="globe-clip">
                  <circle cx={CENTER} cy={CENTER} r={RADIUS} />
                </clipPath>
              </defs>

              <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="url(#globe-face)" />

              <g clipPath="url(#globe-clip)">
                {graticuleD && (
                  <path
                    d={graticuleD}
                    fill="none"
                    stroke="#22d3ee"
                    strokeOpacity="0.14"
                    strokeWidth="0.4"
                  />
                )}

                {countryPaths.map((c) => {
                  const isThailand = c.name === "Thailand";
                  let fill = "#334155";
                  let fillOp = 0.85;
                  if (isThailand) {
                    fill = "#0891b2";
                    fillOp = 0.7;
                  } else if (c.ratio >= 0.6) {
                    fill = "#dc2626";
                    fillOp = 0.85;
                  } else if (c.ratio >= 0.3) {
                    fill = "#b91c1c";
                    fillOp = 0.75;
                  } else if (c.ratio > 0) {
                    fill = "#7f1d1d";
                    fillOp = 0.7;
                  }
                  const isHovered = hover?.name === c.name;
                  return (
                    <path
                      key={c.key}
                      d={c.d}
                      fill={isHovered ? "#22d3ee" : fill}
                      fillOpacity={isHovered ? 0.55 : fillOp}
                      stroke={isThailand || isHovered ? "#67e8f9" : "#0a0e13"}
                      strokeOpacity={isThailand || isHovered ? 0.95 : 0.85}
                      strokeWidth={isThailand || isHovered ? 0.9 : 0.45}
                      strokeLinejoin="round"
                      style={{ cursor: "pointer", transition: "fill-opacity 120ms" }}
                      onMouseEnter={(e) => {
                        const rect = (
                          e.currentTarget.closest("svg") as SVGSVGElement
                        ).getBoundingClientRect();
                        setHover({
                          name: c.name,
                          count: c.count,
                          weight: c.weight,
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                        });
                      }}
                      onMouseMove={(e) => {
                        const rect = (
                          e.currentTarget.closest("svg") as SVGSVGElement
                        ).getBoundingClientRect();
                        setHover((h) =>
                          h
                            ? { ...h, x: e.clientX - rect.left, y: e.clientY - rect.top }
                            : h
                        );
                      }}
                      onMouseLeave={() => setHover(null)}
                    />
                  );
                })}

                {/* Attack trails */}
                {trails.map((t) => (
                  <path
                    key={t.key}
                    d={t.d}
                    fill="none"
                    stroke="#67e8f9"
                    strokeOpacity={t.opacity}
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    filter="url(#glow)"
                  />
                ))}

                {/* Thailand pulse */}
                {thailandPoint && (
                  <g filter="url(#glow)">
                    <circle
                      cx={thailandPoint[0]}
                      cy={thailandPoint[1]}
                      r="3.2"
                      fill="#22d3ee"
                    />
                    {!reduceMotion && (
                      <circle
                        cx={thailandPoint[0]}
                        cy={thailandPoint[1]}
                        r="3.2"
                        fill="none"
                        stroke="#67e8f9"
                        strokeWidth="1.1"
                      >
                        <animate
                          attributeName="r"
                          from="3.2"
                          to="14"
                          dur="1.8s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="stroke-opacity"
                          from="0.8"
                          to="0"
                          dur="1.8s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                  </g>
                )}
              </g>

              <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="url(#globe-vignette)" />

              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="#22d3ee"
                strokeOpacity="0.45"
                strokeWidth="0.9"
              />
              {void sphereD}
            </svg>
          </div>

          </div>
          {/* /Globe + whirl scale wrapper */}

          {/* Hover tooltip */}
          {hover && (
            <div
              className="absolute z-20 pointer-events-none bg-background/90 backdrop-blur-sm border border-border/60 rounded-md px-3 py-2 text-xs shadow-lg"
              style={{
                left: hover.x + 14,
                top: hover.y + 14,
                transform:
                  hover.x > 320 ? "translateX(calc(-100% - 28px))" : undefined,
              }}
            >
              <div className="font-medium text-foreground">{hover.name}</div>
              {hover.name === "Thailand" ? (
                <div className="text-cyan-400">Target location</div>
              ) : hover.count > 0 ? (
                <div className="text-muted-foreground">
                  {hover.count} incident{hover.count === 1 ? "" : "s"} · score{" "}
                  {hover.weight.toFixed(1)}
                </div>
              ) : (
                <div className="text-muted-foreground">No incidents</div>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-10 bg-background/85 backdrop-blur-sm border border-border/40 rounded-md px-3 py-2 text-[11px] pointer-events-none">
            <div className="font-medium mb-1.5 opacity-80">Severity</div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: severityColor("critical") }} />
                Critical
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: severityColor("high") }} />
                High
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: severityColor("medium") }} />
                Med
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: severityColor("low") }} />
                Low
              </span>
              <span className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border/40">
                <span className="w-2 h-2 rounded-full" style={{ background: "#22d3ee" }} />
                Target
              </span>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-8 h-8 flex items-center justify-center rounded-md bg-background/85 backdrop-blur-sm border border-border/60 text-foreground/90 hover:bg-background hover:text-primary transition-colors"
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => zoomBy(1.25)}
              disabled={zoom >= ZOOM_MAX - 0.001}
              className="w-8 h-8 flex items-center justify-center rounded-md bg-background/85 backdrop-blur-sm border border-border/60 text-foreground/90 hover:bg-background hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base leading-none"
              aria-label="Zoom in"
              title="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => zoomBy(0.8)}
              disabled={zoom <= ZOOM_MIN + 0.001}
              className="w-8 h-8 flex items-center justify-center rounded-md bg-background/85 backdrop-blur-sm border border-border/60 text-foreground/90 hover:bg-background hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base leading-none"
              aria-label="Zoom out"
              title="Zoom out"
            >
              −
            </button>
            <button
              type="button"
              onClick={resetView}
              className="w-8 h-8 flex items-center justify-center rounded-md bg-background/85 backdrop-blur-sm border border-border/60 text-foreground/90 hover:bg-background hover:text-primary transition-colors text-[10px] font-semibold tracking-wider"
              aria-label="Reset view"
              title="Reset view"
            >
              RST
            </button>
          </div>

          {/* Executive Summary — overlay shown only in fullscreen */}
          {isFullscreen && (
            <div className="absolute top-3 left-3 z-20 w-[540px] max-w-[46vw] shadow-2xl animate-fade-in">
              <ExecutiveSummary />
            </div>
          )}

          {/* Hint */}
          <div className="absolute bottom-3 right-3 z-10 text-[10px] text-muted-foreground/70 pointer-events-none">
            drag · scroll to zoom · hover
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThreatMap;
