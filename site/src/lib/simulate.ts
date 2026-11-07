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

/** Standard normal draw (Box-Muller). */
function gauss(rand: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

/**
 * How unsure we are of each side's strength over the rest of the season, on the log scale of its
 * scoring rate. Without it every run assumes today's ratings are exact and the odds come out too sure.
 */
const STRENGTH_SD = 0.08;

/** A game's score distribution: the prediction's grid (draw-corrected) or, without one, Poisson. */
interface ScoreDist {
  cells: { i: number; j: number; p: number }[];
}

function scoreDist(p: Prediction): ScoreDist {
  const cells: ScoreDist["cells"] = [];
  if (p.grid?.length) {
    p.grid.forEach((row, i) => row.forEach((x, j) => x > 1e-6 && cells.push({ i, j, p: x })));
  } else {
    const pois = (l: number) => Array.from({ length: 11 }, (_, k) => Math.exp(-l) * l ** k / [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800][k]);
    const h = pois(p.lh);
    const a = pois(p.la);
    h.forEach((x, i) => a.forEach((y, j) => x * y > 1e-6 && cells.push({ i, j, p: x * y })));
  }
  return { cells };
}

/**
 * One score from the distribution, tilted by the two sides' strength draws for this run: a tilt of
 * d scales the home rate by e^d and the away rate by e^-d, which keeps the grid's draw correction.
 */
function sampleScore(dist: ScoreDist, d: number, rand: () => number): [number, number] {
  let total = 0;
  const w = dist.cells.map((c) => (total += c.p * Math.exp(d * (c.i - c.j))));
  const r = rand() * total;
  let k = 0;
  while (k < w.length - 1 && w[k] < r) k++;
  return [dist.cells[k].i, dist.cells[k].j];
}

/** The cells of a score distribution that end in one result (0 home win, 1 draw, 2 away win). */
const resultOf = (i: number, j: number) => (i > j ? 0 : i === j ? 1 : 2);
const only = (dist: ScoreDist, r: number): ScoreDist => ({ cells: dist.cells.filter((c) => resultOf(c.i, c.j) === r) });

/**
 * `focus` lists upcoming fixtures whose stakes we want. In every run each of them is replayed as a
 * home win, a draw and an away win with everything else held the same, so "if they win / draw /
 * lose" compares like with like: winning can never come out worse than drawing.
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
    .filter((x) => x.p)
    .map((x) => ({ ...x, dist: scoreDist(x.p) }));

  const n = base.length;
  const stats = new Map(base.map((r) => [r.team, { champion: 0, europe: 0, relegation: 0, points: 0, position: 0 }]));
  const rand = mulberry32(league.tsdb * 7919 + remaining.length);
  // Replayed scores draw from their own stream, so the season odds stay the same with or without focus games.
  const replay = mulberry32(league.tsdb * 104729 + remaining.length);
  // Per focus game: counts by its forced result of each side's season ending [champion, europe, relegation].
  type Focus = { f: Fixture; by: ScoreDist[]; home: number[][]; away: number[][] };
  const zero = () => [0, 1, 2].map(() => [0, 0, 0]);
  const focused: Focus[] = remaining
    .filter((x) => focus.has(x.f.id))
    .map((x) => ({ f: x.f, by: [0, 1, 2].map((r) => only(x.dist, r)), home: zero(), away: zero() }));
  const played = new Map<string, [number, number]>();
  const tilt = new Map<string, number>();

  const add = (h: TableRow, a: TableRow, hg: number, ag: number, sign: 1 | -1) => {
    h.gf += sign * hg;
    h.ga += sign * ag;
    a.gf += sign * ag;
    a.ga += sign * hg;
    if (hg > ag) h.points += 3 * sign;
    else if (hg < ag) a.points += 3 * sign;
    else {
      h.points += sign;
      a.points += sign;
    }
  };

  for (let run = 0; run < runs; run++) {
    const rows = new Map<string, TableRow>(base.map((r) => [r.team, { ...r, form: [] }]));
    const shock = new Map(base.map((r) => [r.team, gauss(rand) * STRENGTH_SD]));
    for (const { f, dist } of remaining) {
      const d = (shock.get(f.home) ?? 0) - (shock.get(f.away) ?? 0);
      const [hg, ag] = sampleScore(dist, d, rand);
      if (focus.has(f.id)) {
        played.set(f.id, [hg, ag]);
        tilt.set(f.id, d);
      }
      add(rows.get(f.home)!, rows.get(f.away)!, hg, ag, 1);
    }
    // Level on points, goal difference and goals: a coin toss, never the alphabet.
    const lot = new Map([...rows.keys()].map((t) => [t, rand()]));
    const cmp = (x: TableRow, y: TableRow) => compareRows(x, y, false) || lot.get(x.team)! - lot.get(y.team)!;
    const order = [...rows.values()].sort(cmp);
    const ending = (i: number) => [i === 0 ? 1 : 0, i < league.zones.europe ? 1 : 0, i >= n - league.zones.relegation ? 1 : 0];
    const placeOf = (row: TableRow) => {
      let i = 0;
      for (const other of rows.values()) if (other !== row && cmp(other, row) < 0) i++;
      return i;
    };
    for (const g of focused) {
      const h = rows.get(g.f.home)!;
      const a = rows.get(g.f.away)!;
      const [hg, ag] = played.get(g.f.id)!;
      const actual = resultOf(hg, ag);
      add(h, a, hg, ag, -1);
      for (let r = 0; r < 3; r++) {
        // The result this run produced keeps its score; the other two get a score of that result.
        const [fh, fa] = r === actual ? [hg, ag] : sampleScore(g.by[r], tilt.get(g.f.id)!, replay);
        add(h, a, fh, fa, 1);
        ending(placeOf(h)).forEach((v, k) => (g.home[r][k] += v));
        ending(placeOf(a)).forEach((v, k) => (g.away[r][k] += v));
        add(h, a, fh, fa, -1);
      }
      add(h, a, hg, ag, 1);
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
  for (const g of focused) {
    if (g.by.some((d) => !d.cells.length)) continue;
    const side = (c: number[][]) => {
      const by = (k: number) => [0, 1, 2].map((r) => r3(c[r][k] / runs)) as [number, number, number];
      return { champion: by(0), europe: by(1), relegation: by(2) };
    };
    impact[g.f.id] = { home: side(g.home), away: side(g.away) };
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
