import { motion } from "framer-motion";
import { Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";

interface PresentationChromeProps {
  slideIndex: number;
  total: number;
  title: string;
  paused: boolean;
  intervalMs: number;
  restartKey: string | number;
  reduceMotion: boolean;
  onTogglePause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onJump: (index: number) => void;
}

const pad2 = (n: number) => n.toString().padStart(2, "0");

export const ChromeTopBar = ({
  title,
  slideIndex,
  total,
  paused,
  intervalMs,
  restartKey,
  reduceMotion,
}: Pick<PresentationChromeProps, "title" | "slideIndex" | "total" | "paused" | "intervalMs" | "restartKey" | "reduceMotion">) => (
  <div className="relative">
    {/* Top-edge drain bar */}
    <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden bg-primary/10">
      <motion.div
        key={restartKey}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: paused ? undefined : 0 }}
        transition={{
          duration: paused || reduceMotion ? 0 : intervalMs / 1000,
          ease: "linear",
        }}
        className="h-full w-full origin-left bg-gradient-to-r from-primary/70 via-primary to-cyan-300 shadow-[0_0_14px_hsl(193_95%_55%_/_0.55)]"
      />
    </div>

    {/* Title row */}
    <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary/80">Live</span>
        <span className="h-3 w-px bg-border/60" />
        <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-foreground">{title}</span>
      </div>
      <span className="font-mono text-[10px] tabular-nums tracking-[0.2em] text-primary">
        {pad2(slideIndex + 1)} <span className="text-foreground/40">/</span> {pad2(total)}
      </span>
    </div>
  </div>
);

export const ChromeFooter = ({
  slideIndex,
  total,
  paused,
  onTogglePause,
  onPrev,
  onNext,
  onJump,
}: Pick<PresentationChromeProps, "slideIndex" | "total" | "paused" | "onTogglePause" | "onPrev" | "onNext" | "onJump">) => (
  <div className="flex items-center justify-between border-t border-border/40 px-4 py-2.5">
    {/* Dots */}
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const active = i === slideIndex;
        return (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => onJump(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              active
                ? "w-6 bg-primary shadow-[0_0_10px_hsl(193_95%_55%_/_0.55)]"
                : "w-1.5 bg-foreground/25 hover:bg-foreground/60"
            }`}
          />
        );
      })}
    </div>

    {/* Controls */}
    <div className="flex items-center gap-1">
      <ChromeBtn ariaLabel="Previous slide" title="Previous" onClick={onPrev}>
        <ChevronLeft className="h-3.5 w-3.5" />
      </ChromeBtn>
      <ChromeBtn
        ariaLabel={paused ? "Resume rotation" : "Pause rotation"}
        title={paused ? "Resume" : "Pause"}
        onClick={onTogglePause}
      >
        {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
      </ChromeBtn>
      <ChromeBtn ariaLabel="Next slide" title="Next" onClick={onNext}>
        <ChevronRight className="h-3.5 w-3.5" />
      </ChromeBtn>
    </div>
  </div>
);

const ChromeBtn = ({
  children,
  onClick,
  ariaLabel,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  title: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    title={title}
    className="flex h-7 w-7 items-center justify-center rounded-md border border-border/50 bg-background/70 text-foreground/80 transition-colors hover:border-primary/40 hover:bg-background hover:text-primary"
  >
    {children}
  </button>
);
