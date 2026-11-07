/**
 * Maç istatistikleri (şut, isabetli şut, xG, bahis oranları) football-data.co.uk sezon
 * dosyalarından alınır ve takım adları kanonik slug'lara çevrilir.
 *
 *   tsx scripts/stats.ts history <klasör>   -> data/stats-history.json (bir kez, arşiv CSV'lerinden)
 *   tsx scripts/stats.ts current            -> data/stats-current.json (bot her koşuda)
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { LEAGUES, SEASON } from "../src/lib/leagues";
import { allTeams, resolveTeam } from "../src/lib/teams";

const DATA = join(import.meta.dirname, "../data");
export const CURRENT_SEASON_CODE = SEASON.slice(2, 4) + SEASON.slice(5);

/**
 * Row: [league, season, date, home, away, hg, ag, hs, as, hst, ast, hxg, axg,
 *       oddsH, oddsD, oddsA, closeH, closeD, closeA, over25, under25]
 * Missing values are null. "odds*" are the average pre-match prices published before the
 * game (football-data collects them on the Friday/Tuesday before), "close*" are closing prices.
 */
export type StatRow = [string, string, string, string, string, number, number, ...(number | null)[]];

function parseDate(d: string): string {
  const [dd, mm, yy] = d.split("/");
  return `${yy.length === 2 ? `20${yy}` : yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

export function parseCsv(text: string, league: string, season: string, unknown: Set<string>): StatRow[] {
  const [header, ...lines] = text.replace(/^﻿/, "").split(/\r?\n/);
  const cols = header.split(",");
  const idx = (...names: string[]) => names.map((n) => cols.indexOf(n)).find((i) => i >= 0) ?? -1;
  const at = {
    date: idx("Date"), home: idx("HomeTeam"), away: idx("AwayTeam"), hg: idx("FTHG"), ag: idx("FTAG"),
    hs: idx("HS"), as: idx("AS"), hst: idx("HST"), ast: idx("AST"), hxg: idx("HxG"), axg: idx("AxG"),
    oh: idx("AvgH", "BbAvH"), od: idx("AvgD", "BbAvD"), oa: idx("AvgA", "BbAvA"),
    ch: idx("AvgCH"), cd: idx("AvgCD"), ca: idx("AvgCA"),
    o25: idx("Avg>2.5", "BbAv>2.5"), u25: idx("Avg<2.5", "BbAv<2.5"),
  };
  const num = (c: string[], i: number) => {
    if (i < 0) return null;
    const v = Number(c[i]);
    return c[i] === "" || c[i] === undefined || !Number.isFinite(v) ? null : v;
  };
  const out: StatRow[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const c = line.split(",");
    if (c[at.hg] === "" || c[at.hg] === undefined) continue;
    const home = resolveTeam(c[at.home]);
    const away = resolveTeam(c[at.away]);
    if (!home) unknown.add(c[at.home]);
    if (!away) unknown.add(c[at.away]);
    if (!home || !away) continue;
    out.push([
      league, season, parseDate(c[at.date]), home, away, Number(c[at.hg]), Number(c[at.ag]),
      num(c, at.hs), num(c, at.as), num(c, at.hst), num(c, at.ast), num(c, at.hxg), num(c, at.axg),
      num(c, at.oh), num(c, at.od), num(c, at.oa), num(c, at.ch), num(c, at.cd), num(c, at.ca),
      num(c, at.o25), num(c, at.u25),
    ]);
  }
  return out;
}

const seasonLabel = (code: string) => `20${code.slice(0, 2)}-${code.slice(2)}`;

export async function fetchCurrent(): Promise<{ rows: StatRow[]; unknown: string[]; failed: string[] }> {
  const unknown = new Set<string>();
  const failed: string[] = [];
  const rows: StatRow[] = [];
  for (const l of LEAGUES) {
    try {
      const res = await fetch(`https://football-data.co.uk/mmz4281/${CURRENT_SEASON_CODE}/${l.csv}.csv`, {
        signal: AbortSignal.timeout(30_000),
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      rows.push(...parseCsv(await res.text(), l.code, seasonLabel(CURRENT_SEASON_CODE), unknown));
    } catch {
      failed.push(l.code);
    }
  }
  return { rows, unknown: [...unknown], failed };
}

/**
 * Average pre-match odds for upcoming games (football-data publishes them a few days before
 * each round). Row: [league, home, away, oddsH, oddsD, oddsA, over25, under25].
 */
export async function fetchUpcomingOdds(): Promise<(string | number | null)[][] | null> {
  try {
    const res = await fetch("https://football-data.co.uk/fixtures.csv", { signal: AbortSignal.timeout(30_000), redirect: "follow" });
    if (!res.ok) return null;
    const [header, ...lines] = (await res.text()).replace(/^\uFEFF/, "").split(/\r?\n/);
    const cols = header.split(",");
    const at = (n: string) => cols.indexOf(n);
    const byCsv = new Map(LEAGUES.map((l) => [l.csv, l.code]));
    const out: (string | number | null)[][] = [];
    for (const line of lines) {
      const c = line.split(",");
      const league = byCsv.get(c[at("Div")]);
      const home = resolveTeam(c[at("HomeTeam")] ?? "");
      const away = resolveTeam(c[at("AwayTeam")] ?? "");
      if (!league || !home || !away) continue;
      const n = (k: string) => (c[at(k)] ? Number(c[at(k)]) : null);
      if (!n("AvgH") || !n("AvgD") || !n("AvgA")) continue;
      out.push([league, home, away, n("AvgH"), n("AvgD"), n("AvgA"), n("Avg>2.5"), n("Avg<2.5")]);
    }
    return out;
  } catch {
    return null;
  }
}

/** Display names for the Python engine's explanations. */
export function writeTeamNames() {
  writeFileSync(join(DATA, "team-names.json"), JSON.stringify(Object.fromEntries(allTeams().map((t) => [t.slug, t.name]))));
}

async function main() {
  const mode = process.argv[2];
  if (mode === "history") {
    const dir = process.argv[3];
    const unknown = new Set<string>();
    const rows: StatRow[] = [];
    for (const l of LEAGUES) {
      for (const season of readdirSync(join(dir, l.csv)).sort()) {
        const file = readdirSync(join(dir, l.csv, season)).find((f) => f.endsWith(".csv"));
        if (file) rows.push(...parseCsv(readFileSync(join(dir, l.csv, season, file), "utf8"), l.code, seasonLabel(season), unknown));
      }
    }
    if (unknown.size) throw new Error(`Bilinmeyen takım: ${[...unknown].join(", ")}`);
    rows.sort((a, b) => a[2].localeCompare(b[2]));
    writeFileSync(join(DATA, "stats-history.json"), JSON.stringify(rows));
    console.log(`${rows.length} maç -> stats-history.json`);
  } else if (mode === "current") {
    const { rows, unknown, failed } = await fetchCurrent();
    if (unknown.length) console.warn(`Tanınmayan takım: ${unknown.join(", ")}`);
    if (failed.length) console.warn(`Alınamayan lig: ${failed.join(", ")}`);
    const path = join(DATA, "stats-current.json");
    let keep: StatRow[] = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
    // New season: last season's rows join the archive.
    const old = keep.filter((r) => r[1] !== SEASON);
    if (old.length) {
      const histPath = join(DATA, "stats-history.json");
      const hist: StatRow[] = JSON.parse(readFileSync(histPath, "utf8"));
      const seen = new Set(hist.map((r) => `${r[0]}|${r[1]}|${r[3]}|${r[4]}`));
      hist.push(...old.filter((r) => !seen.has(`${r[0]}|${r[1]}|${r[3]}|${r[4]}`)));
      writeFileSync(histPath, JSON.stringify(hist.sort((a, b) => a[2].localeCompare(b[2]))));
      console.log(`${old.length} eski sezon maçı -> stats-history.json`);
      keep = keep.filter((r) => r[1] === SEASON);
    }
    // Keep previously stored rows of leagues that failed this time.
    const merged = [...rows, ...keep.filter((r) => failed.includes(r[0]))].sort((a, b) => a[2].localeCompare(b[2]));
    writeFileSync(path, JSON.stringify(merged));
    console.log(`${merged.length} maç -> stats-current.json`);
    const odds = await fetchUpcomingOdds();
    if (odds) writeFileSync(join(DATA, "odds-upcoming.json"), JSON.stringify(odds));
    console.log(`${odds?.length ?? 0} yaklaşan maç oranı -> odds-upcoming.json`);
    writeTeamNames();
  } else {
    console.error("Kullanım: tsx scripts/stats.ts history <klasör> | current");
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("stats.ts")) main();
