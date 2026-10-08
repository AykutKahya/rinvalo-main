/**
 * Sezon simülasyonu: kalan maçları modelin beklenen golleriyle binlerce kez oynatır ve her
 * takımın şampiyonluk, Avrupa ve küme düşme ihtimalini sayar.
 */
import type { League } from "./leagues";
import { buildTable, compareRows, type TableRow } from "./table";
import type { Fixture, MatchImpact, Prediction, TeamOutlook } from "./types";

/** Small deterministic PRNG so the published numbers do not jump between identical runs. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function samplePoisson(lambda: number, rand: () => number): number {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > l);
  return k - 1;
}

/**
 * `focus` lists upcoming fixtures whose stakes we want: for each, the same runs are split by that
 * game's result, so "if they win / draw / lose" odds come at no extra cost.
 */
export function simulateLeague(
  league: League,
  fixtures: Fixture[],
  predictions: Record<string, Prediction>,
  runs = 5000,
  focus: Set<string> = new Set(),
): { outlook: TeamOutlook[]; impact: Record<string, MatchImpact> } {
  const base = buildTable(fixtures, fixtures.flatMap((f) => [f.home, f.away]));
  const remaining = fixtures
    .filter((f) => f.status !== "finished")
    .map((f) => ({ f, p: predictions[f.id] }))
    .filter((x) => x.p);

  const n = base.length;
  const stats = new Map(base.map((r) => [r.team, { champion: 0, europe: 0, relegation: 0, points: 0, position: 0 }]));
  const rand = mulberry32(league.tsdb * 7919 + remaining.length);
  // Per focus game: counts by its result (0 home win, 1 draw, 2 away win) of each side's season ending.
  type Tally = { runs: number[]; home: number[][]; away: number[][] }; // [result][champion, europe, relegation]
  const zero = () => [0, 1, 2].map(() => [0, 0, 0]);
  const tallies = new Map<string, Tally>(remaining.filter((x) => focus.has(x.f.id)).map((x) => [x.f.id, { runs: [0, 0, 0], home: zero(), away: zero() }]));
  const results = new Map<string, number>();

  for (let run = 0; run < runs; run++) {
    const rows = new Map<string, TableRow>(base.map((r) => [r.team, { ...r, form: [] }]));
    for (const { f, p } of remaining) {
      const hg = samplePoisson(p.lh, rand);
      const ag = samplePoisson(p.la, rand);
      if (tallies.has(f.id)) results.set(f.id, hg > ag ? 0 : hg === ag ? 1 : 2);
      const h = rows.get(f.home)!;
      const a = rows.get(f.away)!;
      h.gf += hg;
      h.ga += ag;
      a.gf += ag;
      a.ga += hg;
      if (hg > ag) h.points += 3;
      else if (hg < ag) a.points += 3;
      else {
        h.points++;
        a.points++;
      }
    }
    const order = [...rows.values()].sort((x, y) => compareRows(x, y) || (rand() < 0.5 ? -1 : 1));
    const place = new Map(order.map((r, i) => [r.team, i]));
    const ending = (team: string) => {
      const i = place.get(team)!;
      return [i === 0 ? 1 : 0, i < league.zones.europe ? 1 : 0, i >= n - league.zones.relegation ? 1 : 0];
    };
    for (const { f } of remaining) {
      const t = tallies.get(f.id);
      if (!t) continue;
      const r = results.get(f.id)!;
      t.runs[r]++;
      ending(f.home).forEach((v, k) => (t.home[r][k] += v));
      ending(f.away).forEach((v, k) => (t.away[r][k] += v));
    }
    order.forEach((r, i) => {
      const s = stats.get(r.team)!;
      if (i === 0) s.champion++;
      if (i < league.zones.europe) s.europe++;
      if (i >= n - league.zones.relegation) s.relegation++;
      s.points += r.points;
      s.position += i + 1;
    });
  }

  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  const impact: Record<string, MatchImpact> = {};
  for (const [id, t] of tallies) {
    // Too few runs with one of the results to say anything reliable.
    if (Math.min(...t.runs) < 150) continue;
    const side = (c: number[][]) => {
      const by = (k: number) => [0, 1, 2].map((r) => r3(c[r][k] / t.runs[r])) as [number, number, number];
      return { champion: by(0), europe: by(1), relegation: by(2) };
    };
    impact[id] = { home: side(t.home), away: side(t.away) };
  }
  const outlook = [...stats.entries()]
    .map(([team, s]) => ({
      team,
      champion: r3(s.champion / runs),
      europe: r3(s.europe / runs),
      relegation: r3(s.relegation / runs),
      avgPoints: Math.round((s.points / runs) * 10) / 10,
      avgPosition: Math.round((s.position / runs) * 10) / 10,
    }))
    .sort((a, b) => a.avgPosition - b.avgPosition);
  return { outlook, impact };
}

/** League-phase sizes: 36 clubs, 8 games each (6 in the Conference League). */
export const CUP_PHASE_GAMES: Record<string, number> = { ucl: 144, uel: 144, uecl: 108 };

/**
 * A cup's league phase: odds of finishing top 8 (straight to the round of 16), 9-24 (play-off)
 * or 25-36 (out). Reuses the league simulation with the cup's lines.
 */
export function simulateCupPhase(code: string, tsdb: number, fixtures: Fixture[], predictions: Record<string, Prediction>, runs = 5000) {
  const phase = fixtures.filter((f) => f.round <= 8);
  const lines = { tsdb, zones: { europe: 8, relegation: 12 } } as League;
  return simulateLeague(lines, phase, predictions, runs).outlook;
}

/**
 * Odds that `first` (home side of the first leg) goes through a knockout tie of one or two legs.
 * A level aggregate goes to extra time (a third of a game) and then penalties, a coin toss.
 */
export function tieOdds(legs: { home: string; away: string; status: string; hg: number | null; ag: number | null; p?: Prediction }[], first: string, runs = 5000, seed = 1): number | null {
  if (legs.some((l) => l.status !== "finished" && !l.p)) return null;
  const rand = mulberry32(seed);
  let wins = 0;
  for (let run = 0; run < runs; run++) {
    let a = 0;
    let b = 0;
    let last: Prediction | undefined;
    for (const l of legs) {
      const [hg, ag] = l.status === "finished" ? [l.hg!, l.ag!] : [samplePoisson(l.p!.lh, rand), samplePoisson(l.p!.la, rand)];
      if (l.home === first) {
        a += hg;
        b += ag;
      } else {
        a += ag;
        b += hg;
      }
      if (l.p) last = l.p;
    }
    if (a === b && last) {
      const firstHome = legs[legs.length - 1].home === first;
      const ea = samplePoisson((firstHome ? last.lh : last.la) / 3, rand);
      const eb = samplePoisson((firstHome ? last.la : last.lh) / 3, rand);
      a += ea;
      b += eb;
    }
    if (a > b || (a === b && rand() < 0.5)) wins++;
  }
  return Math.round((wins / runs) * 1000) / 1000;
}
