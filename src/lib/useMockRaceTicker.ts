import { useEffect, useRef, useState } from "react";
import {
  codeFromName,
  computeScore,
  hashToTeamColor,
  severityWeight,
  type RaceResponder,
} from "./raceMetrics";

const MOCK_NAMES = [
  "Somchai Wongpaiboon",
  "Apinya Thanasiri",
  "Krit Sripetch",
  "Narin Chaiyaphum",
  "Pim Chatchai",
  "Thanapon Rojana",
  "Vorapon Kiatisuk",
  "Yada Somsri",
];

interface MockSeed {
  name: string;
  totalIncidents: number;
  resolved: number;
  criticals: number;
  highs: number;
  mediums: number;
  lows: number;
  bestResponseMs: number;
  lastResponseMs: number;
  lapHistory: number[];
}

function seedResponder(name: string, i: number): MockSeed {
  const total = 28 + Math.floor(Math.random() * 35);
  const resolved = Math.floor(total * (0.55 + Math.random() * 0.35));
  const criticals = Math.floor(Math.random() * 5);
  const highs = Math.floor(Math.random() * 9);
  const mediums = Math.floor(Math.random() * 12);
  const lows = Math.floor(Math.random() * 6);
  const baseTime = 50_000 + i * 12_000 + Math.random() * 80_000;
  const lapHistory = Array.from({ length: 6 }, () =>
    Math.max(22_000, baseTime + (Math.random() - 0.5) * 50_000),
  );
  const best = Math.min(...lapHistory);
  const last = lapHistory[lapHistory.length - 1];
  return {
    name,
    totalIncidents: total,
    resolved,
    criticals,
    highs,
    mediums,
    lows,
    bestResponseMs: best,
    lastResponseMs: last,
    lapHistory,
  };
}

function finalize(seeds: MockSeed[]): RaceResponder[] {
  const withSeverity = seeds.map((s) => ({
    ...s,
    severityWeight: severityWeight(s.criticals, s.highs, s.mediums, s.lows),
  }));
  const maxResolved = Math.max(1, ...withSeverity.map((r) => r.resolved));
  const maxSeverityWeight = Math.max(1, ...withSeverity.map((r) => r.severityWeight));

  return withSeverity
    .map((r) => {
      const breakdown = computeScore({
        resolved: r.resolved,
        bestResponseMs: r.bestResponseMs,
        severityWeight: r.severityWeight,
        maxResolved,
        maxSeverityWeight,
      });
      return {
        name: r.name,
        code: codeFromName(r.name),
        teamColor: hashToTeamColor(r.name),
        totalIncidents: r.totalIncidents,
        resolved: r.resolved,
        criticals: r.criticals,
        highs: r.highs,
        mediums: r.mediums,
        lows: r.lows,
        severityWeight: r.severityWeight,
        bestResponseMs: r.bestResponseMs,
        lastResponseMs: r.lastResponseMs,
        breakdown,
        score: breakdown.score,
        lapHistory: r.lapHistory,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function useMockRaceTicker() {
  const [rows, setRows] = useState(() =>
    finalize(MOCK_NAMES.map(seedResponder)),
  );
  const [sessionStart] = useState<number>(() => Date.now());
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      setRows((prev) => {
        // Reduce back to seeds we can mutate safely
        const seeds: MockSeed[] = prev.map((r) => ({
          name: r.name,
          totalIncidents: r.totalIncidents,
          resolved: r.resolved,
          criticals: r.criticals,
          highs: r.highs,
          mediums: r.mediums,
          lows: r.lows,
          bestResponseMs: r.bestResponseMs,
          lastResponseMs: r.lastResponseMs,
          lapHistory: [...r.lapHistory],
        }));

        const activeCount = 1 + Math.floor(Math.random() * 3);
        const usedIdx = new Set<number>();
        for (let i = 0; i < activeCount; i++) {
          let idx = Math.floor(Math.random() * seeds.length);
          let safety = 0;
          while (usedIdx.has(idx) && safety++ < 8) {
            idx = Math.floor(Math.random() * seeds.length);
          }
          usedIdx.add(idx);
          const row = seeds[idx];

          const newLap = 28_000 + Math.random() * 180_000;
          row.lapHistory = [...row.lapHistory.slice(-9), newLap];
          row.lastResponseMs = newLap;
          if (row.bestResponseMs === 0 || newLap < row.bestResponseMs) {
            row.bestResponseMs = newLap;
          }
          row.resolved = Math.min(row.totalIncidents, row.resolved + 1);

          // Sometimes a new incident also arrives
          if (Math.random() < 0.45) {
            row.totalIncidents += 1;
            const sev = Math.random();
            if (sev < 0.15) row.criticals += 1;
            else if (sev < 0.45) row.highs += 1;
            else if (sev < 0.82) row.mediums += 1;
            else row.lows += 1;
          }
        }

        return finalize(seeds);
      });
    };
    tickRef.current = window.setInterval(tick, 1500);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  return { rows, sessionStart };
}
