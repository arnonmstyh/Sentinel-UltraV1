import type { Incident } from "@/types/incident";

// Score contribution weights (must sum to 1.0). Multiplied by 100 to produce a 0-100 pace score.
export const SCORE_WEIGHTS = {
  resolved: 0.4,
  speed: 0.3,
  severity: 0.3,
} as const;

export interface ScoreBreakdown {
  score: number;              // 0-100 composite
  resolvedPct: number;        // contribution to score (0-40)
  speedPct: number;           // contribution to score (0-30)
  severityPct: number;        // contribution to score (0-30)
}

export interface RaceResponder {
  name: string;
  code: string;
  teamColor: string;
  totalIncidents: number;
  resolved: number;
  criticals: number;
  highs: number;
  mediums: number;
  lows: number;
  severityWeight: number;     // 3·crit + 2·high + 1·medium + 0.5·low
  lastResponseMs: number;
  bestResponseMs: number;
  lapHistory: number[];       // response times in ms, chronological
  breakdown: ScoreBreakdown;
  score: number;              // mirrored from breakdown.score for convenient sorting
}

const F1_TEAM_PALETTE = [
  "#DC2626",
  "#F97316",
  "#06B6D4",
  "#1E3A8A",
  "#10B981",
  "#8B5CF6",
  "#EAB308",
  "#EC4899",
  "#059669",
  "#7C3AED",
];

// Manual color overrides for specific responders (wins over the hash).
const COLOR_OVERRIDES: Record<string, string> = {
  "Officer Kanwaree Sutthilaor": "#DC2626", // Red
  "AIT Bandit": "#8B5CF6",                  // Purple
};

export function hashToTeamColor(name: string): string {
  const override = COLOR_OVERRIDES[name.trim()];
  if (override) return override;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return F1_TEAM_PALETTE[Math.abs(h) % F1_TEAM_PALETTE.length];
}

export function codeFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "—";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  const head = parts[0].slice(0, 2);
  const tail = parts[1][0] ?? "";
  return (head + tail).toUpperCase();
}

export function severityWeight(
  criticals: number,
  highs: number,
  mediums: number,
  lows: number = 0,
): number {
  return criticals * 3 + highs * 2 + mediums * 1 + lows * 0.5;
}

interface ScoreInput {
  resolved: number;
  bestResponseMs: number;
  severityWeight: number;
  maxResolved: number;
  maxSeverityWeight: number;
}

// Composite 0-100 score:
//   40% most-resolved (count normalized to field max)
//   30% time-to-response (best lap, inverted + capped)
//   30% severity load (weighted mix normalized to field max)
export function computeScore(r: ScoreInput): ScoreBreakdown {
  const resolvedNorm = r.maxResolved > 0 ? r.resolved / r.maxResolved : 0;

  const CAP_MS = 600_000; // 10 min baseline
  const effectiveLap = r.bestResponseMs > 0 ? Math.min(r.bestResponseMs, CAP_MS) : CAP_MS;
  const speedNorm = 1 - effectiveLap / CAP_MS;

  const severityNorm =
    r.maxSeverityWeight > 0 ? r.severityWeight / r.maxSeverityWeight : 0;

  const resolvedPct = resolvedNorm * SCORE_WEIGHTS.resolved * 100;
  const speedPct = speedNorm * SCORE_WEIGHTS.speed * 100;
  const severityPct = severityNorm * SCORE_WEIGHTS.severity * 100;
  const score = resolvedPct + speedPct + severityPct;

  return {
    score: Math.round(score * 10) / 10,
    resolvedPct: Math.round(resolvedPct * 10) / 10,
    speedPct: Math.round(speedPct * 10) / 10,
    severityPct: Math.round(severityPct * 10) / 10,
  };
}

export function formatLapTime(ms: number): string {
  if (!ms || ms <= 0) return "--:--.---";
  const clamped = Math.max(0, ms);
  const totalSec = Math.floor(clamped / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const millis = Math.floor(clamped % 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
}

export function formatGap(leaderScore: number, score: number): string {
  if (leaderScore <= 0) return "—";
  const deltaPoints = Math.max(0, leaderScore - score);
  if (deltaPoints < 0.05) return "+0.000";
  const sec = deltaPoints * 0.12;
  if (sec < 60) return `+${sec.toFixed(3)}`;
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(3);
  return `+${m}:${s.padStart(6, "0")}`;
}

export function formatSessionClock(elapsedMs: number): string {
  const total = Math.max(0, Math.floor(elapsedMs / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function parseResponseTimeToMs(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  const colon = t.split(":").map((p) => parseInt(p, 10));
  if (colon.length === 2 && colon.every((n) => !isNaN(n))) {
    return (colon[0] * 60 + colon[1]) * 1000;
  }
  if (colon.length === 3 && colon.every((n) => !isNaN(n))) {
    return ((colon[0] * 60 + colon[1]) * 60 + colon[2]) * 1000;
  }
  const n = parseFloat(t);
  if (!isNaN(n)) return n * 60_000;
  return 0;
}

export function buildLeaderboardFromIncidents(incidents: Incident[]): RaceResponder[] {
  type Accum = {
    name: string;
    totalIncidents: number;
    resolved: number;
    criticals: number;
    highs: number;
    mediums: number;
    lows: number;
    responseTimesMs: number[];
  };
  const stats = incidents.reduce<Record<string, Accum>>((acc, incident) => {
    const name = (incident.responder || "").trim();
    if (!name || name === "Unassigned") return acc;
    if (!acc[name]) {
      acc[name] = {
        name,
        totalIncidents: 0,
        resolved: 0,
        criticals: 0,
        highs: 0,
        mediums: 0,
        lows: 0,
        responseTimesMs: [],
      };
    }
    const row = acc[name];
    row.totalIncidents += 1;
    if (incident.responseStatus === "responded") row.resolved += 1;
    if (incident.severity === "critical") row.criticals += 1;
    if (incident.severity === "high") row.highs += 1;
    if (incident.severity === "medium") row.mediums += 1;
    if (incident.severity === "low") row.lows += 1;
    if (incident.responseTime) {
      const ms = parseResponseTimeToMs(incident.responseTime);
      if (ms > 0) row.responseTimesMs.push(ms);
    }
    return acc;
  }, {});

  const rows = Object.values(stats).map((r) => {
    const sev = severityWeight(r.criticals, r.highs, r.mediums, r.lows);
    const best = r.responseTimesMs.length ? Math.min(...r.responseTimesMs) : 0;
    const last = r.responseTimesMs[r.responseTimesMs.length - 1] ?? 0;
    return { ...r, severityWeight: sev, bestResponseMs: best, lastResponseMs: last };
  });

  const maxResolved = Math.max(1, ...rows.map((r) => r.resolved));
  const maxSeverityWeight = Math.max(1, ...rows.map((r) => r.severityWeight));

  return rows
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
        lastResponseMs: r.lastResponseMs,
        bestResponseMs: r.bestResponseMs,
        lapHistory: r.responseTimesMs,
        breakdown,
        score: breakdown.score,
      } satisfies RaceResponder;
    })
    .sort((a, b) => b.score - a.score);
}
