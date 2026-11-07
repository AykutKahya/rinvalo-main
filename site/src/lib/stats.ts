import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cache } from "react";
import { SEASON } from "./leagues";

/** stats-current.json row: [league, season, date, home, away, hg, ag, hs, as, hst, ast, hxg, axg, ...odds] */
type StatRow = [string, string, string, string, string, number, number, ...(number | null)[]];

export interface TeamStats {
  team: string;
  played: number;
  points: number;
  gf: number;
  ga: number;
  xgf: number;
  xga: number;
  shots: number;
  onTarget: number;
  /** Points a team "deserved" from its chances: each game's xG turned into win/draw/loss odds. */
  xpts: number;
}

const read = cache((): StatRow[] => {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "data", "stats-current.json"), "utf8")) as StatRow[];
  } catch {
    return [];
  }
});

function poisson(lambda: number, max = 10): number[] {
  const out = [Math.exp(-lambda)];
  for (let k = 1; k <= max; k++) out.push((out[k - 1] * lambda) / k);
  return out;
}

/** Expected points for each side from the two xG values. */
export function expectedPoints(hxg: number, axg: number): [number, number] {
  const h = poisson(hxg);
  const a = poisson(axg);
  let win = 0;
  let draw = 0;
  for (let i = 0; i < h.length; i++)
    for (let j = 0; j < a.length; j++) {
      if (i > j) win += h[i] * a[j];
      else if (i === j) draw += h[i] * a[j];
    }
  const loss = 1 - win - draw;
  return [3 * win + draw, 3 * loss + draw];
}

/** This season's per-team totals for one league, only from games with xG. */
export const leagueStats = cache((league: string): TeamStats[] => {
  const by = new Map<string, TeamStats>();
  const get = (team: string) => {
    let s = by.get(team);
    if (!s) by.set(team, (s = { team, played: 0, points: 0, gf: 0, ga: 0, xgf: 0, xga: 0, shots: 0, onTarget: 0, xpts: 0 }));
    return s;
  };
  for (const r of read()) {
    if (r[0] !== league || r[1] !== SEASON) continue;
    const [, , , home, away, hg, ag, hs, as, hst, ast, hxg, axg] = r;
    if (hxg == null || axg == null) continue;
    const [xh, xa] = expectedPoints(hxg, axg);
    const sides: [TeamStats, number, number, number, number, number | null, number | null, number][] = [
      [get(home), hg, ag, hxg, axg, hs, hst, xh],
      [get(away), ag, hg, axg, hxg, as, ast, xa],
    ];
    for (const [s, f, a, xf, xa_, sh, st, xp] of sides) {
      s.played++;
      s.points += f > a ? 3 : f === a ? 1 : 0;
      s.gf += f;
      s.ga += a;
      s.xgf += xf;
      s.xga += xa_;
      s.shots += sh ?? 0;
      s.onTarget += st ?? 0;
      s.xpts += xp;
    }
  }
  return [...by.values()].sort((x, y) => y.xgf - y.xga - (x.xgf - x.xga));
});

/** Date (YYYY-MM-DD) of the latest game with xG in this season's data for one league. */
export const statsUntil = cache((league: string): string | null => {
  let last: string | null = null;
  for (const r of read()) if (r[0] === league && r[1] === SEASON && r[11] != null && (!last || r[2] > last)) last = r[2];
  return last;
});
