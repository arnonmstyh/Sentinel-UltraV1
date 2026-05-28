import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { ChromeFooter, ChromeTopBar } from "./PresentationChrome";
import PresentationExecSummary from "./PresentationExecSummary";
import PresentationLeaderboard from "./PresentationLeaderboard";
import PresentationStatus from "./PresentationStatus";
import PresentationVpnThreats from "./PresentationVpnThreats";

const INTERVAL_MS = 10000;
const WIDTH_STORAGE_KEY = "sentinel.presentation.width";
const WIDTH_MIN = 380;
const WIDTH_MAX = 820;
const WIDTH_DEFAULT = 540;

const SLIDES = [
  { key: "summary", title: "Executive Summary" },
  { key: "leaderboard", title: "Responder Leaderboard" },
  { key: "status", title: "Operational Status" },
  { key: "vpn", title: "VPN Threats" },
] as const;

const usePrefersReducedMotion = () => {
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

interface PresentationOverlayProps {
  isActive: boolean;
  isInteracting: boolean;
  onExit: () => void;
}

const PresentationOverlay = ({ isActive, isInteracting, onExit }: PresentationOverlayProps) => {
  const reduceMotion = usePrefersReducedMotion();
  const [slideIndex, setSlideIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Persistable width
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === "undefined") return WIDTH_DEFAULT;
    const stored = Number(window.localStorage.getItem(WIDTH_STORAGE_KEY));
    return Number.isFinite(stored) && stored >= WIDTH_MIN && stored <= WIDTH_MAX ? stored : WIDTH_DEFAULT;
  });
  const widthRef = useRef(width);
  widthRef.current = width;
  const [resizing, setResizing] = useState(false);
  useEffect(() => {
    try {
      window.localStorage.setItem(WIDTH_STORAGE_KEY, String(width));
    } catch {
      /* ignore quota errors */
    }
  }, [width]);

  // Content height tracking → smooth height animation between slides
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setContentHeight(el.offsetHeight);
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [slideIndex, width]);

  const advance = useCallback((direction: 1 | -1 = 1) => {
    setSlideIndex((i) => (i + direction + SLIDES.length) % SLIDES.length);
    setRestartKey((k) => k + 1);
  }, []);

  const jump = useCallback((index: number) => {
    setSlideIndex(index);
    setRestartKey((k) => k + 1);
  }, []);

  // Auto-advance — gated by pause, hover, globe interaction, and active resize
  useEffect(() => {
    if (!isActive) return;
    if (paused || hovered || isInteracting || resizing) return;

    timerRef.current = window.setTimeout(() => advance(1), INTERVAL_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [isActive, paused, hovered, isInteracting, resizing, slideIndex, restartKey, advance]);

  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        advance(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        advance(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, advance]);

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
    const startX = e.clientX;
    const startW = widthRef.current;
    const onMove = (ev: PointerEvent) => {
      const next = Math.max(WIDTH_MIN, Math.min(WIDTH_MAX, startW + (ev.clientX - startX)));
      setWidth(next);
    };
    const onUp = () => {
      setResizing(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (!isActive) return null;

  const slide = SLIDES[slideIndex];
  const effectivelyPaused = paused || hovered || isInteracting || resizing;

  const enterVariant = reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 };
  const animateVariant = { opacity: 1, x: 0 };
  const exitVariant = reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 };
  const slideTransition = reduceMotion
    ? { duration: 0.25 }
    : { type: "spring" as const, stiffness: 280, damping: 32, mass: 0.7 };

  return (
    <div
      className="absolute top-3 left-3 z-20 animate-fade-in"
      style={{
        width,
        maxWidth: "min(820px, calc(100vw - 24px))",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Card className="relative overflow-hidden border-border/70 bg-gradient-card shadow-[0_30px_60px_rgba(0,0,0,0.55)]">
        <ChromeTopBar
          title={slide.title}
          slideIndex={slideIndex}
          total={SLIDES.length}
          paused={effectivelyPaused}
          intervalMs={INTERVAL_MS}
          restartKey={`${slideIndex}-${restartKey}`}
          reduceMotion={reduceMotion}
        />

        {/* Animated height container — each slide can have its own natural length */}
        <motion.div
          className="relative overflow-hidden"
          animate={{ height: contentHeight }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 180, damping: 26, mass: 0.6 }
          }
        >
          <div ref={contentRef}>
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.key}
                initial={enterVariant}
                animate={animateVariant}
                exit={exitVariant}
                transition={slideTransition}
              >
                {slide.key === "summary" && <PresentationExecSummary reduceMotion={reduceMotion} />}
                {slide.key === "leaderboard" && <PresentationLeaderboard reduceMotion={reduceMotion} />}
                {slide.key === "status" && <PresentationStatus reduceMotion={reduceMotion} />}
                {slide.key === "vpn" && <PresentationVpnThreats reduceMotion={reduceMotion} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        <ChromeFooter
          slideIndex={slideIndex}
          total={SLIDES.length}
          paused={paused}
          onTogglePause={() => setPaused((p) => !p)}
          onPrev={() => advance(-1)}
          onNext={() => advance(1)}
          onJump={jump}
        />

        {/* Resize handle (bottom-right corner) */}
        <div
          role="separator"
          aria-label="Resize panel"
          aria-orientation="vertical"
          onPointerDown={startResize}
          className={`absolute bottom-1 right-1 h-4 w-4 cursor-ew-resize select-none ${
            resizing ? "text-primary" : "text-foreground/40 hover:text-primary"
          }`}
          title="Drag to resize"
        >
          <svg viewBox="0 0 16 16" className="h-full w-full" aria-hidden>
            <g fill="currentColor">
              <circle cx="14" cy="6" r="1" />
              <circle cx="14" cy="10" r="1" />
              <circle cx="14" cy="14" r="1" />
              <circle cx="10" cy="10" r="1" />
              <circle cx="10" cy="14" r="1" />
              <circle cx="6" cy="14" r="1" />
            </g>
          </svg>
        </div>
      </Card>

      {/* Exit + width readout */}
      <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
        <span className="rounded border border-border/40 bg-background/60 px-2 py-0.5 tabular-nums">
          {Math.round(width)}px
        </span>
        <button
          type="button"
          onClick={onExit}
          className="rounded border border-border/40 bg-background/60 px-2 py-0.5 transition-colors hover:border-primary/40 hover:text-primary"
        >
          Esc · Exit
        </button>
      </div>
    </div>
  );
};

export default PresentationOverlay;
