/**
 * Sezon simülasyonu: kalan maçları modelin beklenen golleriyle binlerce kez oynatır ve her
 * takımın şampiyonluk, Avrupa ve küme düşme ihtimalini sayar.
 */
import type { League } from "./leagues";
import { buildTable, compareRows, type TableRow } from "./table";
import type { Fixture, Prediction, TeamOutlook } from "./types";

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

export function simulateLeague(
  league: League,
  fixtures: Fixture[],
  predictions: Record<string, Prediction>,
  runs = 5000,
): TeamOutlook[] {
  const base = buildTable(fixtures, fixtures.flatMap((f) => [f.home, f.away]));
  const remaining = fixtures
    .filter((f) => f.status !== "finished")
    .map((f) => ({ f, p: predictions[f.id] }))
    .filter((x) => x.p);

  const n = base.length;
  const stats = new Map(base.map((r) => [r.team, { champion: 0, europe: 0, relegation: 0, points: 0, position: 0 }]));
  const rand = mulberry32(league.tsdb * 7919 + remaining.length);

  for (let run = 0; run < runs; run++) {
    const rows = new Map<string, TableRow>(base.map((r) => [r.team, { ...r, form: [] }]));
    for (const { f, p } of remaining) {
      const hg = samplePoisson(p.lh, rand);
      const ag = samplePoisson(p.la, rand);
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
  return [...stats.entries()]
    .map(([team, s]) => ({
      team,
      champion: r3(s.champion / runs),
      europe: r3(s.europe / runs),
      relegation: r3(s.relegation / runs),
      avgPoints: Math.round((s.points / runs) * 10) / 10,
      avgPosition: Math.round((s.position / runs) * 10) / 10,
    }))
    .sort((a, b) => a.avgPosition - b.avgPosition);
}
