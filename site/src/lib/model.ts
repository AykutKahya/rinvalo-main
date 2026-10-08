/**
 * Rinvalo tahmin modeli: zaman ağırlıklı Poisson (Dixon-Coles düzeltmeli).
 *
 * Her takımın bir hücum ve bir savunma gücü vardır. Ev sahibinin beklenen golü
 *   exp(lig ortalaması + ev avantajı + ev hücum - deplasman savunma)
 * Yakın tarihli maçlar daha ağır basar (yarı ömür). Az maçı olan takım lige yeni
 * çıkmış takım varsayımına doğru çekilir; böylece her maç için tahmin üretilir.
 */
import type { Prediction } from "./types";

export const MODEL_VERSION = "poisson-dc-1";

export interface ModelMatch {
  date: string;
  home: string;
  away: string;
  hg: number;
  ag: number;
}

export interface ModelOptions {
  halfLifeDays: number;
  /** Ridge strength pulling team strengths towards their prior. */
  shrink: number;
  /** Dixon-Coles low-score correlation. */
  rho: number;
  /** Prior for teams that did not play in the league last season. */
  newcomerAttack: number;
  newcomerDefence: number;
}

export const DEFAULT_OPTIONS: ModelOptions = {
  halfLifeDays: 240,
  shrink: 4,
  rho: -0.07,
  newcomerAttack: -0.22,
  newcomerDefence: -0.18,
};

export interface FittedModel {
  mu: number;
  homeAdv: number;
  attack: Map<string, number>;
  defence: Map<string, number>;
  prior: (team: string) => [number, number];
}

const DAY = 86_400_000;
const clamp = (x: number) => Math.max(-0.5, Math.min(0.5, x));

/**
 * @param established teams that played in this league in the previous season; everyone
 *        else gets the newcomer prior.
 */
export function fit(
  matches: ModelMatch[],
  asOf: Date,
  established: Set<string>,
  options: ModelOptions = DEFAULT_OPTIONS,
): FittedModel {
  const now = asOf.getTime();
  const rows = matches
    .filter((m) => Date.parse(m.date) < now)
    .map((m) => ({ ...m, w: Math.pow(0.5, (now - Date.parse(m.date)) / DAY / options.halfLifeDays) }))
    .filter((m) => m.w > 0.01);

  const prior = (t: string): [number, number] =>
    established.has(t) ? [0, 0] : [options.newcomerAttack, options.newcomerDefence];

  const teams = new Set<string>();
  rows.forEach((m) => (teams.add(m.home), teams.add(m.away)));
  established.forEach((t) => teams.add(t));

  const attack = new Map<string, number>();
  const defence = new Map<string, number>();
  teams.forEach((t) => {
    const [a, d] = prior(t);
    attack.set(t, a);
    defence.set(t, d);
  });

  let totalW = 0;
  let goals = 0;
  rows.forEach((m) => ((totalW += m.w * 2), (goals += m.w * (m.hg + m.ag))));
  let mu = Math.log(Math.max(goals / Math.max(totalW, 1e-9), 0.5));
  let homeAdv = 0.2;

  // Block coordinate ascent: each block is an exact per-parameter Newton step on a concave
  // objective, so updating attacks, then defences, then the league terms converges without
  // the oscillation that a joint update of the non-identifiable mu/strength pair causes.
  const rates = () =>
    rows.map((m) => ({
      lh: Math.exp(mu + homeAdv + attack.get(m.home)! - defence.get(m.away)!),
      la: Math.exp(mu + attack.get(m.away)! - defence.get(m.home)!),
    }));
  const add = (map: Map<string, number>, k: string, v: number) => map.set(k, (map.get(k) ?? 0) + v);

  for (let iter = 0; iter < 100; iter++) {
    let change = 0;

    for (const block of ["attack", "defence"] as const) {
      const r = rates();
      const g = new Map<string, number>();
      const h = new Map<string, number>();
      rows.forEach((m, i) => {
        const { lh, la } = r[i];
        if (block === "attack") {
          add(g, m.home, m.w * (m.hg - lh));
          add(h, m.home, m.w * lh);
          add(g, m.away, m.w * (m.ag - la));
          add(h, m.away, m.w * la);
        } else {
          add(g, m.away, m.w * (lh - m.hg));
          add(h, m.away, m.w * lh);
          add(g, m.home, m.w * (la - m.ag));
          add(h, m.home, m.w * la);
        }
      });
      const params = block === "attack" ? attack : defence;
      for (const t of teams) {
        const p = prior(t)[block === "attack" ? 0 : 1];
        const v = params.get(t)!;
        const step = clamp(((g.get(t) ?? 0) - options.shrink * (v - p)) / ((h.get(t) ?? 0) + options.shrink));
        params.set(t, v + step);
        change = Math.max(change, Math.abs(step));
      }
    }

    const r = rates();
    let gMu = 0;
    let hMu = 0;
    let gH = 0;
    let hH = 0;
    rows.forEach((m, i) => {
      gMu += m.w * (m.hg - r[i].lh + m.ag - r[i].la);
      hMu += m.w * (r[i].lh + r[i].la);
      gH += m.w * (m.hg - r[i].lh);
      hH += m.w * r[i].lh;
    });
    const stepMu = hMu > 0 ? clamp(gMu / hMu) : 0;
    mu += stepMu;
    const stepH = hH > 0 ? clamp(gH / hH - stepMu) : 0;
    homeAdv += stepH;
    change = Math.max(change, Math.abs(stepMu), Math.abs(stepH));
    if (change < 1e-6) break;
  }

  return { mu, homeAdv, attack, defence, prior };
}

function poisson(k: number, lambda: number): number {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

const MAX_GOALS = 10;

export function predict(
  model: FittedModel,
  home: string,
  away: string,
  fixtureId: string,
  madeAt: Date,
  options: ModelOptions = DEFAULT_OPTIONS,
): Prediction {
  const [pah, pdh] = model.prior(home);
  const [paa, pda] = model.prior(away);
  const lh = Math.exp(model.mu + model.homeAdv + (model.attack.get(home) ?? pah) - (model.defence.get(away) ?? pda));
  const la = Math.exp(model.mu + (model.attack.get(away) ?? paa) - (model.defence.get(home) ?? pdh));

  const grid: number[][] = [];
  let total = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    grid.push([]);
    for (let a = 0; a <= MAX_GOALS; a++) {
      let p = poisson(h, lh) * poisson(a, la);
      const r = options.rho;
      if (h === 0 && a === 0) p *= 1 - lh * la * r;
      else if (h === 0 && a === 1) p *= 1 + lh * r;
      else if (h === 1 && a === 0) p *= 1 + la * r;
      else if (h === 1 && a === 1) p *= 1 - r;
      grid[h].push(p);
      total += p;
    }
  }

  let pH = 0;
  let pD = 0;
  let pA = 0;
  let over = 0;
  let btts = 0;
  const cells: [number, number, number][] = [];
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = grid[h][a] / total;
      grid[h][a] = p;
      if (h > a) pH += p;
      else if (h === a) pD += p;
      else pA += p;
      if (h + a > 2) over += p;
      if (h > 0 && a > 0) btts += p;
      cells.push([h, a, p]);
    }
  }
  cells.sort((x, y) => y[2] - x[2]);

  const outcome = pH >= pD && pH >= pA ? 0 : pA >= pD ? 2 : 1;
  const inOutcome = cells.find(([h, a]) => (outcome === 0 ? h > a : outcome === 2 ? a > h : h === a))!;

  const round = (x: number, d = 4) => Math.round(x * 10 ** d) / 10 ** d;
  return {
    fixtureId,
    madeAt: madeAt.toISOString(),
    model: MODEL_VERSION,
    lh: round(lh, 3),
    la: round(la, 3),
    p: [round(pH), round(pD), round(pA)],
    score: [inOutcome[0], inOutcome[1]],
    top: cells.slice(0, 6).map(([h, a, p]) => [h, a, round(p)]),
    over25: round(over),
    btts: round(btts),
    grid: grid.slice(0, 6).map((row) => row.slice(0, 6).map((p) => round(p))),
  };
}

export function outcomeOf(hg: number, ag: number): 0 | 1 | 2 {
  return hg > ag ? 0 : hg === ag ? 1 : 2;
}

export function pickOf(p: [number, number, number]): 0 | 1 | 2 {
  return p[0] >= p[1] && p[0] >= p[2] ? 0 : p[2] >= p[1] ? 2 : 1;
}
