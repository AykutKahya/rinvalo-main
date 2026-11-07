import { crestSrc } from "@/components/Crest";
import { getEurope, getHistory, getMatches, getRatings, getSeason, getSimulation, leagueTable, LEAGUES, type EuropeModel } from "./data";
import { leagueStats } from "./stats";
import { team } from "./teams";

export interface CompareTeam {
  slug: string;
  name: { tr: string; en: string };
  short: string;
  color: string;
  league: string;
  crest?: string;
  elo: number | null;
  /** Goal-model goals for/against per game against an average opponent. */
  gf: number | null;
  ga: number | null;
  pos: number;
  points: number;
  played: number;
  form: string[];
  xgf: number | null;
  xga: number | null;
  xpts: number | null;
  champion: number | null;
  europe: number | null;
  relegation: number | null;
  /** Rating on the scale shared by every league (the one the cup predictions use). */
  shared: number | null;
  /** League games, oldest first: [at home 1/0, goals for, goals against]. The last `season` are this season. */
  games: [number, number, number][];
  season: number;
}

/** Keyed by fixture id: [kickoff date, hg, ag, predicted home goals, predicted away goals, 1-X-2 of a game still to play]. */
export type CompareFixture = [string, number | null, number | null, number | null, number | null, [number, number, number] | null];

export interface CompareData {
  leagues: { code: string; name: string }[];
  teams: CompareTeam[];
  fixtures: Record<string, CompareFixture>;
  model: EuropeModel | null;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/** The last 20 league games, or the whole season if longer. */
function recent(list: { at: string; g: [number, number, number]; now: boolean }[]) {
  const sorted = [...list].sort((x, y) => x.at.localeCompare(y.at));
  const season = sorted.filter((x) => x.now).length;
  return { games: sorted.slice(-Math.max(20, season)).map((x) => x.g), season };
}

/** Everything the comparison tool needs, sent once as a static JSON file. */
export function compareData(): CompareData {
  const { leagues: ratings } = getRatings();
  const sim = getSimulation();
  const europe = getEurope();
  // League games per team, oldest first: past seasons from the bundled history, then this season.
  const games = new Map<string, { at: string; g: [number, number, number]; now: boolean }[]>();
  const add = (at: string, h: string, a: string, hg: number, ag: number, now: boolean) => {
    for (const [t, g] of [
      [h, [1, hg, ag]],
      [a, [0, ag, hg]],
    ] as const) {
      if (!games.has(t)) games.set(t, []);
      games.get(t)!.push({ at, g: [...g], now });
    }
  };
  for (const [, , date, h, a, hg, ag] of getHistory().matches) add(date, h, a, hg, ag, false);
  for (const f of getSeason().fixtures) if (f.status === "finished" && f.hg !== null && f.ag !== null) add(f.kickoff, f.home, f.away, f.hg, f.ag, true);
  const teams: CompareTeam[] = [];
  for (const l of LEAGUES) {
    const table = leagueTable(l.code);
    const stats = new Map(leagueStats(l.code).map((s) => [s.team, s]));
    const rating = new Map((ratings[l.code] ?? []).map((r) => [r.team, r]));
    const outlook = new Map((sim.leagues[l.code] ?? []).map((o) => [o.team, o]));
    table.forEach((row, i) => {
      const t = team(row.team);
      const r = rating.get(row.team);
      const s = stats.get(row.team);
      const o = outlook.get(row.team);
      teams.push({
        slug: row.team,
        name: { tr: t.name, en: team(row.team, "en").name },
        short: t.short,
        color: t.colors[0] === "#ffffff" ? t.colors[1] : t.colors[0],
        league: l.code,
        crest: crestSrc(row.team),
        elo: r ? Math.round(r.elo) : null,
        gf: r ? r.gf : null,
        ga: r ? r.ga : null,
        pos: i + 1,
        points: row.points,
        played: row.played,
        form: row.form,
        xgf: s && s.played ? r2(s.xgf / s.played) : null,
        xga: s && s.played ? r2(s.xga / s.played) : null,
        xpts: s ? r2(s.xpts) : null,
        champion: o ? o.champion : null,
        europe: o ? o.europe : null,
        relegation: o ? o.relegation : null,
        shared: europe.ratings?.[row.team] ?? null,
        ...recent(games.get(row.team) ?? []),
      });
    });
  }
  const fixtures = Object.fromEntries(
    getMatches().map((m): [string, CompareFixture] => [m.id, [m.kickoff.slice(0, 10), m.hg, m.ag, m.prediction?.score[0] ?? null, m.prediction?.score[1] ?? null, m.status !== "finished" && m.prediction ? m.prediction.p : null]]),
  );
  return { leagues: LEAGUES.map((l) => ({ code: l.code, name: l.name })), teams, fixtures, model: europe.model ?? null };
}
