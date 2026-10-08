/**
 * Geriye dönük test: modeli her hafta yalnız o tarihe kadarki maçlarla yeniden kurar,
 * sonraki haftanın maçlarını tahmin eder ve gerçek sonuçla karşılaştırır.
 *   npm run backtest            -> 2024-25 ve 2025-26 sonuçları
 *   npm run backtest -- --grid  -> parametre taraması
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LEAGUES } from "../src/lib/leagues";
import { DEFAULT_OPTIONS, fit, outcomeOf, pickOf, predict, type ModelMatch, type ModelOptions } from "../src/lib/model";
import type { HistoryFile } from "../src/lib/types";

const history: HistoryFile = JSON.parse(readFileSync(join(import.meta.dirname, "../data/history.json"), "utf8"));
const SEASONS = ["2024-25", "2025-26"];

interface Score {
  n: number;
  hits: number;
  exact: number;
  logloss: number;
  brier: number;
  homeHits: number;
}

function run(options: ModelOptions) {
  const perLeague: Record<string, Score> = {};
  for (const league of LEAGUES) {
    const all = history.matches.filter((m) => m[0] === league.code);
    const s: Score = { n: 0, hits: 0, exact: 0, logloss: 0, brier: 0, homeHits: 0 };
    for (const season of SEASONS) {
      const prevSeason = `${Number(season.slice(0, 4)) - 1}-${season.slice(2, 4)}`;
      const established = new Set(all.filter((m) => m[1] === prevSeason).flatMap((m) => [m[3], m[4]]));
      const target = all.filter((m) => m[1] === season);
      const pool: ModelMatch[] = all.map((m) => ({ date: m[2], home: m[3], away: m[4], hg: m[5], ag: m[6] }));
      const start = Date.parse(target[0][2]);
      const end = Date.parse(target[target.length - 1][2]) + 86_400_000;
      for (let t = start; t < end; t += 7 * 86_400_000) {
        const week = target.filter((m) => Date.parse(m[2]) >= t && Date.parse(m[2]) < t + 7 * 86_400_000);
        if (!week.length) continue;
        const model = fit(pool, new Date(t), established, options);
        for (const m of week) {
          const pr = predict(model, m[3], m[4], "bt", new Date(t), options);
          const o = outcomeOf(m[5], m[6]);
          s.n++;
          if (pickOf(pr.p) === o) s.hits++;
          if (pr.score[0] === m[5] && pr.score[1] === m[6]) s.exact++;
          if (o === 0) s.homeHits++;
          s.logloss -= Math.log(Math.max(pr.p[o], 1e-6));
          s.brier += pr.p.reduce((acc, p, i) => acc + (p - (i === o ? 1 : 0)) ** 2, 0);
        }
      }
    }
    perLeague[league.code] = s;
  }
  return perLeague;
}

function summary(r: Record<string, Score>) {
  const tot = Object.values(r).reduce(
    (a, s) => ({ n: a.n + s.n, hits: a.hits + s.hits, exact: a.exact + s.exact, logloss: a.logloss + s.logloss, brier: a.brier + s.brier, homeHits: a.homeHits + s.homeHits }),
    { n: 0, hits: 0, exact: 0, logloss: 0, brier: 0, homeHits: 0 },
  );
  return tot;
}

if (process.argv.includes("--grid")) {
  for (const halfLifeDays of [150, 240, 365]) {
    for (const shrink of [2, 4, 8]) {
      for (const rho of [0, -0.07]) {
        const t = summary(run({ ...DEFAULT_OPTIONS, halfLifeDays, shrink, rho }));
        console.log(`hl=${halfLifeDays} k=${shrink} rho=${rho}  acc=${((t.hits / t.n) * 100).toFixed(2)}%  ll=${(t.logloss / t.n).toFixed(4)}  brier=${(t.brier / t.n).toFixed(4)}`);
      }
    }
  }
} else {
  const r = run(DEFAULT_OPTIONS);
  const out: Record<string, unknown> = {};
  for (const [code, s] of Object.entries(r)) {
    out[code] = { matches: s.n, accuracy: s.hits / s.n, exactScore: s.exact / s.n, alwaysHome: s.homeHits / s.n, logloss: s.logloss / s.n, brier: s.brier / s.n };
    console.log(`${code.padEnd(16)} maç=${s.n}  1X2 isabet=%${((s.hits / s.n) * 100).toFixed(1)}  tam skor=%${((s.exact / s.n) * 100).toFixed(1)}  (hep ev sahibi=%${((s.homeHits / s.n) * 100).toFixed(1)})  logloss=${(s.logloss / s.n).toFixed(3)}`);
  }
  const t = summary(r);
  console.log(`TOPLAM           maç=${t.n}  1X2 isabet=%${((t.hits / t.n) * 100).toFixed(1)}  tam skor=%${((t.exact / t.n) * 100).toFixed(1)}  (hep ev sahibi=%${((t.homeHits / t.n) * 100).toFixed(1)})  logloss=${(t.logloss / t.n).toFixed(3)}`);
  out.total = { matches: t.n, accuracy: t.hits / t.n, exactScore: t.exact / t.n, alwaysHome: t.homeHits / t.n, logloss: t.logloss / t.n, brier: t.brier / t.n, seasons: SEASONS };
  writeFileSync(join(import.meta.dirname, "../data/backtest.json"), JSON.stringify(out, null, 1));
}
