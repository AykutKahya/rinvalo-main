import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cache } from "react";
import { LEAGUES, type LeagueCode } from "./leagues";
import { outcomeOf, pickOf } from "./model";
import { buildTable } from "./table";
import type { Fixture, HistoryFile, Prediction, PredictionsFile, SeasonFile, SimulationFile } from "./types";

const DATA = join(process.cwd(), "data");

function read<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(join(DATA, name), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export const getSeason = cache(() => read<SeasonFile>("season.json", { season: "", updatedAt: "", sources: {}, fixtures: [] }));
export const getPredictions = cache(() => read<PredictionsFile>("predictions.json", { model: "", predictions: {} }).predictions);
export const getSimulation = cache(() => read<SimulationFile>("simulation.json", { updatedAt: "", runs: 0, leagues: {} }));
export const getHistory = cache(() => read<HistoryFile>("history.json", { source: "", matches: [] }));

export const getMarket = cache(() => read<Record<string, [number, number, number]>>("market.json", {}));

export interface Scores {
  matches: number;
  accuracy: number;
  logloss: number;
  brier: number;
  rps: number;
}
export interface EngineBacktest {
  seasons: string[];
  overall: Record<string, Scores>;
  perLeague: Record<string, { rinvalo: Scores; old: Scores; market: Scores }>;
  byConfidence: Record<"high" | "medium" | "low", { matches: number; accuracy: number }>;
  calibration: { bin: string; predicted: number; observed: number; n: number }[];
  disagreement: { matches: number; rinvaloRight: number; marketRight: number };
}
export const getEngineBacktest = cache(() => read<EngineBacktest | null>("engine-backtest.json", null));


/** A fixture joined with its frozen or live prediction. */
export interface MatchView extends Fixture {
  prediction: Prediction | null;
  /** Only for finished matches with a prediction. */
  hit: boolean | null;
  exact: boolean | null;
}

export function toView(f: Fixture, predictions: Record<string, Prediction>): MatchView {
  const prediction = predictions[f.id] ?? null;
  const done = f.status === "finished" && f.hg !== null && f.ag !== null;
  return {
    ...f,
    prediction,
    hit: done && prediction ? pickOf(prediction.p) === outcomeOf(f.hg!, f.ag!) : null,
    exact: done && prediction ? prediction.score[0] === f.hg && prediction.score[1] === f.ag : null,
  };
}

export const getMatches = cache((): MatchView[] => {
  const predictions = getPredictions();
  return getSeason().fixtures.map((f) => toView(f, predictions));
});

export function getMatch(id: string): MatchView | undefined {
  return getMatches().find((m) => m.id === id);
}

export function leagueMatches(code: LeagueCode): MatchView[] {
  return getMatches().filter((m) => m.league === code);
}

export function leagueTable(code: LeagueCode) {
  const ms = leagueMatches(code);
  return buildTable(ms, ms.flatMap((m) => [m.home, m.away]));
}

export function teamLeague(slug: string): LeagueCode | undefined {
  return getMatches().find((m) => m.home === slug || m.away === slug)?.league;
}

export function seasonTeams(): { slug: string; league: LeagueCode }[] {
  const seen = new Map<string, LeagueCode>();
  for (const m of getMatches()) {
    seen.set(m.home, m.league);
    seen.set(m.away, m.league);
  }
  return [...seen.entries()].map(([slug, league]) => ({ slug, league }));
}

export interface Record_ {
  n: number;
  hits: number;
  exact: number;
}

export function accuracy(matches: MatchView[]): Record_ {
  const graded = matches.filter((m) => m.hit !== null);
  return { n: graded.length, hits: graded.filter((m) => m.hit).length, exact: graded.filter((m) => m.exact).length };
}

/** Previous meetings across bundled history and this season, newest first. */
export function headToHead(a: string, b: string, limit = 6) {
  const past = getHistory()
    .matches.filter((m) => (m[3] === a && m[4] === b) || (m[3] === b && m[4] === a))
    .map((m) => ({ date: m[2], home: m[3], away: m[4], hg: m[5], ag: m[6] }));
  const now = getMatches()
    .filter((m) => m.status === "finished" && ((m.home === a && m.away === b) || (m.home === b && m.away === a)))
    .map((m) => ({ date: m.kickoff.slice(0, 10), home: m.home, away: m.away, hg: m.hg!, ag: m.ag! }));
  return [...past, ...now].sort((x, y) => y.date.localeCompare(x.date)).slice(0, limit);
}

export { LEAGUES };

export interface TeamRating {
  team: string;
  /** Elo now, and how much the team's last game moved it. */
  elo: number;
  last: number;
  /** Goals and xG for/against per game against an average opponent. */
  gf: number;
  ga: number;
  xgf: number;
  xga: number;
}
export const getRatings = cache(() => read<{ at: string; leagues: Record<string, TeamRating[]> }>("ratings.json", { at: "", leagues: {} }));
