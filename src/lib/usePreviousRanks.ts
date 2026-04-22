import { useEffect, useRef } from "react";
import type { RaceResponder } from "./raceMetrics";

// Returns the map of responder name → rank from the PREVIOUS render.
// Used to detect overtakes and drive position-change animations.
export function usePreviousRanks(rows: RaceResponder[]): Map<string, number> {
  const ref = useRef<Map<string, number>>(new Map());
  const previous = ref.current;
  const current = new Map<string, number>();
  rows.forEach((r, i) => current.set(r.name, i + 1));
  useEffect(() => {
    ref.current = current;
  });
  return previous;
}
