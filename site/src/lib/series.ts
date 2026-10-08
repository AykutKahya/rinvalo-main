import { getRatings, leagueMatches } from "./data";
import { buildTable } from "./table";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SEASON } from "./leagues";

export interface Point {
  date: string;
  value: number;
}
export interface TeamSeries {
  rating: Point[];
  position: Point[];
  xgFor: Point[];
  xgAgainst: Point[];
  teams: number;
}

/** Rolling mean over the last `n` values, so one wild game does not dominate the line. */
function rolling(values: Point[], n = 3): Point[] {
  return values.map((p, i) => {
    const w = values.slice(Math.max(0, i - n + 1), i + 1);
    return { date: p.date, value: Math.round((w.reduce((s, x) => s + x.value, 0) / w.length) * 100) / 100 };
  });
}

/** Season lines for a club's chart: rating after each game, league position, xG for and against. */
export function teamSeries(slug: string, league: string): TeamSeries {
  const rating = (getRatings().leagues[league]?.find((r) => r.team === slug)?.hist ?? []).map(([date, value]) => ({ date, value }));

  const ms = leagueMatches(league);
  const teams = new Set(ms.flatMap((m) => [m.home, m.away]));
  const played = ms.filter((m) => m.status === "finished" && (m.home === slug || m.away === slug)).sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  // Position at the end of each matchday the club played, dated by its own game.
  const position = played.map((m) => {
    const table = buildTable(
      ms.filter((x) => x.round <= m.round),
      teams,
    );
    return { date: m.kickoff.slice(0, 10), value: table.findIndex((r) => r.team === slug) + 1 };
  });

  let rows: (string | number | null)[][] = [];
  try {
    rows = JSON.parse(readFileSync(join(process.cwd(), "data", "stats-current.json"), "utf8"));
  } catch {}
  const games = rows
    .filter((r) => r[0] === league && r[1] === SEASON && (r[3] === slug || r[4] === slug) && r[11] != null && r[12] != null)
    .sort((a, b) => String(a[2]).localeCompare(String(b[2])));
  const xgFor = games.map((r) => ({ date: String(r[2]), value: Number(r[3] === slug ? r[11] : r[12]) }));
  const xgAgainst = games.map((r) => ({ date: String(r[2]), value: Number(r[3] === slug ? r[12] : r[11]) }));
  return { rating, position, xgFor: rolling(xgFor), xgAgainst: rolling(xgAgainst), teams: teams.size };
}
