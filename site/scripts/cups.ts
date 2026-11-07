/**
 * European cups (Champions League, Europa League, Conference League) from TheSportsDB.
 *
 *   tsx scripts/cups.ts            -> data/cups.json (this season, league phase onwards)
 *   tsx scripts/cups.ts history    -> data/cups-history.json (2021-22 .. 2025-26 results, once)
 *
 * Clubs outside the tracked leagues get a slug and are listed in data/cup-teams.json.
 * Qualifying rounds are left out: only games from 1 September on are kept.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CUP_ROUNDS, CUPS, fixtureId, SEASON, TSDB_SEASON, type Cup } from "../src/lib/leagues";
import { normalizeName, resolveTeam } from "../src/lib/teams";
import type { Fixture } from "../src/lib/types";
import { ESPN_LEAGUE, gamesOn, leaguePhase } from "./sources/espn";
import { fetchEvents, status, type TsdbEvent } from "./sources/thesportsdb";

const DATA = join(import.meta.dirname, "../data");
const PUBLIC = join(import.meta.dirname, "../public");

export interface CupsFile {
  season?: string;
  updatedAt: string;
  fixtures: Fixture[];
}
/** [cup, season, date, home, away, hg, ag] */
export type CupHistoryRow = [string, string, string, string, string, number, number];

const load = <T>(name: string, fallback: T): T => (existsSync(join(DATA, name)) ? (JSON.parse(readFileSync(join(DATA, name), "utf8")) as T) : fallback);
const save = (name: string, v: unknown) => writeFileSync(join(DATA, name), JSON.stringify(v) + "\n");

const cupTeams = load<Record<string, [string, string]>>("cup-teams.json", {});
const byName = new Map(Object.entries(cupTeams).map(([slug, [name]]) => [normalizeName(name), slug]));
const badges = new Map<string, string>();
const cupBadges = new Map<string, string>();

/** Letters NFD cannot split into base + accent. */
const TRANSLIT: Record<string, string> = { ø: "o", Ø: "O", ð: "d", Ð: "D", ł: "l", Ł: "L", æ: "ae", Æ: "AE", ß: "ss", đ: "d", Đ: "D", ħ: "h", Ħ: "H", þ: "th" };
const translit = (s: string) => s.replace(/[øØðÐłŁæÆßđĐħĦþ]/g, (c) => TRANSLIT[c]);

/** The source spells some clubs differently from season to season; map them to one slug. */
export const CANONICAL: Record<string, string> = {
  aek: "aek-athens",
  "bodoe-glimt": "bodo-glimt",
  "dynamo-kiev": "dynamo-kyiv",
  "hapoel-be-er-sheva": "hapoel-beer-sheva",
  hearts: "heart-of-midlothian",
  olympiakos: "olympiacos",
  "red-bull-salzburg": "salzburg",
  shamrock: "shamrock-rovers",
  "st-gilloise": "union-saint-gilloise",
  zrinjski: "zrinjski-mostar",
  "steaua-bucuresti": "fcsb",
  "rasenballsport-leipzig": "leipzig",
};

export function slugify(name: string): string {
  const slug = normalizeName(translit(name)).replace(/\s+/g, "-") || "takim";
  return CANONICAL[slug] ?? slug;
}

/** Known slug, or a new one for a club we have not seen before. */
function teamOf(name: string, badge?: string | null): string {
  const slug = resolveTeam(name) ?? byName.get(normalizeName(name)) ?? register(name);
  if (badge) badges.set(slug, badge);
  return slug;
}

function register(name: string): string {
  let slug = slugify(name);
  // Another spelling of a club we already know: keep the slug, prefer the fuller name.
  if (cupTeams[slug] || resolveTeam(slug.replace(/-/g, " "))) {
    if (cupTeams[slug] && name.length > cupTeams[slug][0].length) cupTeams[slug][0] = name;
    byName.set(normalizeName(name), slug);
    return slug;
  }
  const word = normalizeName(name).split(" ").find((w) => w.length >= 3) ?? normalizeName(name);
  cupTeams[slug] = [name, word.slice(0, 3).toUpperCase()];
  byName.set(normalizeName(name), slug);
  return slug;
}

function kickoffOf(e: TsdbEvent): Date | null {
  const ts = e.strTimestamp ?? (e.dateEvent ? `${e.dateEvent}T${e.strTime ?? "12:00:00"}` : null);
  return ts ? new Date(ts.endsWith("Z") || ts.includes("+") ? ts : `${ts}Z`) : null;
}

/** All games of one cup season from 1 September on (the qualifiers end in August). */
async function cupSeason(cup: Cup, season: string) {
  const start = `${season.slice(0, 4)}-09-01`;
  const out: { e: TsdbEvent; round: number; kickoff: Date }[] = [];
  for (const round of CUP_ROUNDS) {
    try {
      for (const e of await fetchEvents(cup.tsdb, round, season)) {
        const kickoff = kickoffOf(e);
        if (kickoff && (e.dateEvent ?? kickoff.toISOString()) >= start) out.push({ e, round, kickoff });
      }
    } catch (err) {
      console.error(`[${cup.code} ${season}] ${round}. tur alınamadı: ${(err as Error).message}`);
    }
  }
  return out;
}

async function downloadBadges() {
  mkdirSync(join(PUBLIC, "crests"), { recursive: true });
  let n = 0;
  const jobs = [...[...badges].map(([slug, url]) => [join(PUBLIC, "crests", `${slug}.png`), url]), ...[...cupBadges].map(([code, url]) => [join(PUBLIC, "leagues", `${code}.png`), url])];
  for (const [path, url] of jobs) {
    if (existsSync(path)) continue;
    try {
      const res = await fetch(`${url}/small`, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) continue;
      writeFileSync(path, Buffer.from(await res.arrayBuffer()));
      n++;
    } catch {}
  }
  const list = (dir: string) => readdirSync(join(PUBLIC, dir)).filter((f) => f.endsWith(".png")).map((f) => f.slice(0, -4)).sort();
  save("crests.json", { teams: list("crests"), leagues: list("leagues") });
  if (n) console.log(`${n} kupa logosu indirildi`);
}

/** League-phase match days of each cup (UTC weekday: 2 Tuesday ... 4 Thursday) and number of rounds. */
const PHASE: Record<string, { days: number[]; rounds: number }> = {
  ucl: { days: [2, 3], rounds: 8 },
  uel: { days: [3, 4], rounds: 8 },
  uecl: { days: [4], rounds: 6 },
};
const PER_ROUND = 18;

/**
 * Fill league-phase games TheSportsDB missed from ESPN. Only for a cup with a round short of its 18
 * games, and only on match days we do not already hold complete; days run in order so each new
 * game's round is one more than the games either club has already played.
 */
async function fillFromEspn(byId: Map<string, Fixture>) {
  const today = new Date().toISOString().slice(0, 10);
  for (const cup of CUPS) {
    const ph = PHASE[cup.code];
    if (!ph || !ESPN_LEAGUE[cup.code]) continue;
    const mine = () => [...byId.values()].filter((f) => f.league === cup.code && f.round >= 1 && f.round <= ph.rounds);
    const short = Array.from({ length: ph.rounds }, (_, i) => i + 1).some((r) => mine().filter((f) => f.round === r).length < PER_ROUND);
    if (!short) continue;
    try {
      const window = await leaguePhase(cup.code);
      if (!window) continue;
      const until = new Date(Date.parse(today) + 10 * 86_400_000).toISOString().slice(0, 10);
      let added = 0;
      // Only clubs this cup already lists: an unfamiliar spelling must not become a second club.
      const clubs = new Set([...byId.values()].filter((f) => f.league === cup.code && f.round >= 1 && f.round <= ph.rounds).flatMap((f) => [f.home, f.away]));
      const club = (name: string) => {
        const slug = resolveTeam(name) ?? byName.get(normalizeName(name)) ?? null;
        return slug && clubs.has(slug) ? slug : null;
      };
      const unknown = new Set<string>();
      for (let t = Date.parse(window[0]); t <= Date.parse(window[1]); t += 86_400_000) {
        const day = new Date(t).toISOString().slice(0, 10);
        if (day > until || !ph.days.includes(new Date(t).getUTCDay())) continue;
        const held = mine().filter((f) => f.kickoff.slice(0, 10) === day);
        if (held.length >= PER_ROUND && held.every((f) => f.status === "finished")) continue;
        for (const g of await gamesOn(cup.code, day)) {
          const home = club(g.home);
          const away = club(g.away);
          if (!home || !away) {
            for (const [n, s] of [[g.home, home], [g.away, away]] as const) if (!s) unknown.add(n);
            continue;
          }
          const st: Fixture["status"] = g.completed ? "finished" : g.state === "in" ? "live" : "scheduled";
          const known = mine().find((f) => f.home === home && f.away === away);
          if (known) {
            // Only fill a result the main source has not given.
            if (st === "finished" && known.status !== "finished") byId.set(known.id, { ...known, status: "finished", hg: g.hg, ag: g.ag, source: "espn" });
            continue;
          }
          const before = (team: string) => mine().filter((f) => (f.home === team || f.away === team) && f.kickoff < g.kickoff.toISOString()).length;
          const round = Math.max(before(home), before(away)) + 1;
          if (round > ph.rounds) continue;
          const id = fixtureId(cup.code, round, home, away);
          byId.set(id, {
            id,
            league: cup.code as Fixture["league"],
            round,
            kickoff: g.kickoff.toISOString(),
            home,
            away,
            venue: g.venue,
            status: st,
            hg: st === "scheduled" ? null : g.hg,
            ag: st === "scheduled" ? null : g.ag,
            source: st === "finished" ? "espn" : null,
          });
          added++;
        }
      }
      if (added) console.log(`[${cup.code}] ESPN'den ${added} eksik maç eklendi`);
      if (unknown.size) console.log(`[${cup.code}] ESPN'de tanınmayan takım adları (maçları atlandı): ${[...unknown].join(", ")}`);
    } catch (err) {
      console.error(`[${cup.code}] ESPN alınamadı: ${(err as Error).message}`);
    }
  }
}

async function current() {
  const prev = load<CupsFile>("cups.json", { updatedAt: "", fixtures: [] });
  if ((prev.season ?? "2026-27") !== SEASON) {
    // New season: last season's results join the archive the cup model learns from.
    const old = prev.season ?? "2026-27";
    const hist = load<CupHistoryRow[]>("cups-history.json", []);
    const seen = new Set(hist.map((r) => `${r[0]}|${r[1]}|${r[2]}|${r[3]}|${r[4]}`));
    for (const f of prev.fixtures) {
      const row: CupHistoryRow = [f.league, old, f.kickoff.slice(0, 10), f.home, f.away, f.hg!, f.ag!];
      if (f.status === "finished" && f.hg !== null && f.ag !== null && !seen.has(row.slice(0, 5).join("|"))) hist.push(row);
    }
    save("cups-history.json", hist);
    console.log(`${old} kupa sezonu arşivlendi; ${SEASON} başlıyor.`);
    prev.fixtures = [];
  }
  const byId = new Map(prev.fixtures.map((f) => [f.id, f]));
  for (const cup of CUPS) {
    let count = 0;
    for (const { e, round, kickoff } of await cupSeason(cup, TSDB_SEASON)) {
      if (e.strLeagueBadge) cupBadges.set(cup.code, e.strLeagueBadge);
      const home = teamOf(e.strHomeTeam, e.strHomeTeamBadge);
      const away = teamOf(e.strAwayTeam, e.strAwayTeamBadge);
      const hasScore = e.intHomeScore !== null && e.intHomeScore !== "" && e.intAwayScore !== null && e.intAwayScore !== "";
      const st = status(e, hasScore, kickoff.getTime());
      const id = fixtureId(cup.code, round, home, away);
      const old = byId.get(id);
      const f: Fixture = {
        id,
        league: cup.code as Fixture["league"],
        round,
        kickoff: kickoff.toISOString(),
        home,
        away,
        venue: e.strVenue || null,
        status: st,
        hg: st === "finished" || st === "live" ? Number(e.intHomeScore) : null,
        ag: st === "finished" || st === "live" ? Number(e.intAwayScore) : null,
        source: st === "finished" ? "thesportsdb" : null,
      };
      // A source glitch must not erase a result we already have.
      byId.set(id, old?.status === "finished" && f.status !== "finished" ? { ...f, status: "finished", hg: old.hg, ag: old.ag, source: old.source } : f);
      count++;
    }
    console.log(`[${cup.code}] ${count} maç`);
  }
  await fillFromEspn(byId);
  save("cups.json", { season: SEASON, updatedAt: new Date().toISOString(), fixtures: [...byId.values()].sort((a, b) => a.kickoff.localeCompare(b.kickoff) || a.id.localeCompare(b.id)) });
  save("cup-teams.json", Object.fromEntries(Object.entries(cupTeams).sort()));
  await downloadBadges();
}

async function history() {
  const rows: CupHistoryRow[] = [];
  for (const season of ["2021-2022", "2022-2023", "2023-2024", "2024-2025", "2025-2026"]) {
    const label = `${season.slice(0, 4)}-${season.slice(7)}`;
    for (const cup of CUPS) {
      let n = 0;
      for (const { e } of await cupSeason(cup, season)) {
        if (e.intHomeScore === null || e.intHomeScore === "" || e.intAwayScore === null || e.intAwayScore === "") continue;
        rows.push([cup.code, label, e.dateEvent ?? "", teamOf(e.strHomeTeam), teamOf(e.strAwayTeam), Number(e.intHomeScore), Number(e.intAwayScore)]);
        n++;
      }
      console.log(`[${cup.code} ${label}] ${n} maç`);
    }
  }
  rows.sort((a, b) => a[2].localeCompare(b[2]));
  save("cups-history.json", rows);
  save("cup-teams.json", Object.fromEntries(Object.entries(cupTeams).sort()));
  console.log(`${rows.length} kupa maçı -> cups-history.json`);
}

if (/[\\/]cups\.ts$/.test(process.argv[1] ?? "")) (process.argv[2] === "history" ? history() : current());
