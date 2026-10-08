import type { CupCode, LeagueCode } from "./leagues";

/** [league, season, date YYYY-MM-DD, home slug, away slug, home goals, away goals] */
export type HistoryMatch = [LeagueCode, string, string, string, string, number, number];

export interface HistoryFile {
  source: string;
  matches: HistoryMatch[];
}

export type FixtureStatus = "scheduled" | "finished" | "postponed" | "live";

export interface Fixture {
  id: string;
  league: LeagueCode | CupCode;
  round: number;
  /** ISO timestamp in UTC. */
  kickoff: string;
  home: string;
  away: string;
  venue: string | null;
  status: FixtureStatus;
  hg: number | null;
  ag: number | null;
  /** Where the score came from. */
  source: "thesportsdb" | "openfootball" | "manual" | null;
}

export interface SourceStatus {
  ok: boolean;
  at: string;
  message: string;
}

export interface SeasonFile {
  season: string;
  updatedAt: string;
  sources: Record<string, SourceStatus>;
  fixtures: Fixture[];
}

export interface Prediction {
  fixtureId: string;
  madeAt: string;
  model: string;
  /** Expected goals. */
  lh: number;
  la: number;
  /** [home win, draw, away win] */
  p: [number, number, number];
  /** Predicted score, consistent with the most likely outcome. */
  score: [number, number];
  /** Most likely scorelines, [home, away, probability]. */
  top: [number, number, number][];
  over25: number;
  btts: number;
  /** Probability grid capped at 5 goals each side: grid[h][a]. */
  grid: number[][];
  /** Engine-only fields (absent on fallback predictions). */
  confidence?: "high" | "medium" | "low";
  reasons?: string[];
  reasonsEn?: string[];
  /** Margin-free betting market probabilities, when odds were published. */
  market?: [number, number, number] | null;
  components?: { goals: [number, number, number]; shots: [number, number, number]; elo: number };
}

export interface PredictionsFile {
  model: string;
  predictions: Record<string, Prediction>;
}

export interface TeamOutlook {
  team: string;
  champion: number;
  europe: number;
  relegation: number;
  avgPoints: number;
  avgPosition: number;
}

/** One side's season-ending odds split by the match result: [win for home, draw, win for away]. */
export interface SideImpact {
  champion: [number, number, number];
  europe: [number, number, number];
  relegation: [number, number, number];
}
export interface MatchImpact {
  home: SideImpact;
  away: SideImpact;
}

export interface SimulationFile {
  updatedAt: string;
  runs: number;
  leagues: Record<string, TeamOutlook[]>;
  /** Stakes of the coming fortnight's games, by fixture id. */
  impact?: Record<string, MatchImpact>;
  /** Cup league phase: champion = 1st, europe = top 8, relegation = 25th-36th. */
  cups?: Record<string, TeamOutlook[]>;
  /** Knockout ties by fixture id: odds that `first` goes through. */
  ties?: Record<string, { first: string; second: string; p: number }>;
}

export interface OverridesFile {
  /** Manual score corrections keyed by fixture id. */
  results: Record<string, { hg: number; ag: number }>;
  /** Manual kickoff corrections keyed by fixture id (ISO, UTC). */
  kickoffs: Record<string, string>;
  postponed: string[];
}
