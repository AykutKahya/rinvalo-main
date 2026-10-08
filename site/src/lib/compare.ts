import { crestSrc } from "@/components/Crest";
import { getMatches, getRatings, getSimulation, leagueTable, LEAGUES } from "./data";
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
}

/** Keyed by fixture id ("home-away"): [kickoff date, hg, ag, predicted home goals, predicted away goals]. */
export type CompareFixture = [string, number | null, number | null, number | null, number | null];

export interface CompareData {
  leagues: { code: string; name: string }[];
  teams: CompareTeam[];
  fixtures: Record<string, CompareFixture>;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Everything the comparison tool needs, sent once as a static JSON file. */
export function compareData(): CompareData {
  const { leagues: ratings } = getRatings();
  const sim = getSimulation();
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
      });
    });
  }
  const fixtures = Object.fromEntries(
    getMatches().map((m): [string, CompareFixture] => [m.id, [m.kickoff.slice(0, 10), m.hg, m.ag, m.prediction?.score[0] ?? null, m.prediction?.score[1] ?? null]]),
  );
  return { leagues: LEAGUES.map((l) => ({ code: l.code, name: l.name })), teams, fixtures };
}
