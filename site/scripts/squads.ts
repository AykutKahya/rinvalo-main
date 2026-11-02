/**
 * Injuries, suspensions and confirmed line-ups from API-FOOTBALL (free plan, key in API_FOOTBALL_KEY).
 *
 * The free plan answers only for yesterday, today and tomorrow, 100 requests a day, 10 a minute.
 * Each run fetches today's and tomorrow's fixtures and absentees at most every three hours
 * (4 requests), and the line-up of every game kicking off within 75 minutes (1 request each, once).
 *
 *   tsx scripts/squads.ts   -> data/squads.json (shown on match pages)
 *                              data/lineups-history.json (kept for a future squad model)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveTeam } from "../src/lib/teams";
import type { Fixture } from "../src/lib/types";

const DATA = join(import.meta.dirname, "../data");
const BASE = "https://v3.football.api-sports.io";
const KEY = process.env.API_FOOTBALL_KEY;
const DAILY_CAP = 90; // of the plan's 100, leaving room for a manual look
const REFRESH_MS = 3 * 3600_000;
const GAP_MS = 6500; // 10 requests a minute
const LINEUP_BEFORE_MS = 75 * 60_000;
const LINEUP_AFTER_MS = 120 * 60_000;
const KEEP_MS = 2 * 86_400_000;

/** API-FOOTBALL league ids of the competitions we cover. */
const LEAGUE: Record<number, string> = {
  203: "super-lig",
  39: "premier-league",
  140: "la-liga",
  135: "serie-a",
  78: "bundesliga",
  61: "ligue-1",
  88: "eredivisie",
  94: "primeira-liga",
  40: "championship",
  2: "ucl",
  3: "uel",
  848: "uecl",
};
/** Source spellings our alias table does not know. */
const ALIAS: Record<string, string> = {
  "Gençlerbirliği S.K.": "genclerbirligi",
  "Vitória SC": "guimaraes",
  "Sheffield Utd": "sheffield-united",
  "Bodo/Glimt": "bodo-glimt",
  "Lask Linz": "lask",
};

export interface Absent {
  name: string;
  kind: "out" | "doubt";
  reason: string;
}
export interface LineupSide {
  formation: string | null;
  coach: string | null;
  xi: { id: number; name: string; number: number | null; pos: string | null }[];
  bench: { id: number; name: string; number: number | null; pos: string | null }[];
}
export interface SquadEntry {
  api: number;
  homeTeam: number;
  awayTeam: number;
  kickoff: string;
  absent?: { home: Absent[]; away: Absent[] };
  lineups?: { home: LineupSide; away: LineupSide };
}
export interface SquadsFile {
  updatedAt: string;
  fetchedAt: string | null;
  quota: { day: string; used: number };
  matches: Record<string, SquadEntry>;
}

const load = <T>(name: string, fallback: T): T => (existsSync(join(DATA, name)) ? (JSON.parse(readFileSync(join(DATA, name), "utf8")) as T) : fallback);
const save = (name: string, v: unknown) => writeFileSync(join(DATA, name), JSON.stringify(v) + "\n");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const slug = (name: string) => ALIAS[name] ?? resolveTeam(name);

const now = new Date(process.env.RINVALO_NOW ?? Date.now());
const day = (offset: number) => new Date(now.getTime() + offset * 86_400_000).toISOString().slice(0, 10);

const file = load<SquadsFile>("squads.json", { updatedAt: "", fetchedAt: null, quota: { day: "", used: 0 }, matches: {} });
if (file.quota.day !== day(0)) file.quota = { day: day(0), used: 0 };
let last = 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function api(path: string): Promise<any[] | null> {
  if (file.quota.used >= DAILY_CAP) return null;
  const wait = last + GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  file.quota.used++;
  const res = await fetch(`${BASE}/${path}`, { headers: { "x-apisports-key": KEY! }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  const body = (await res.json()) as { errors: unknown; response: unknown[] };
  const errors = Array.isArray(body.errors) ? body.errors : Object.values(body.errors ?? {});
  if (errors.length) throw new Error(`${path}: ${JSON.stringify(body.errors)}`);
  return body.response;
}

async function main() {
  if (!KEY) {
    console.log("API_FOOTBALL_KEY yok; eksikler ve ilk 11 atlandı.");
    return;
  }
  const ours: Fixture[] = [...load<{ fixtures: Fixture[] }>("season.json", { fixtures: [] }).fixtures, ...load<{ fixtures: Fixture[] }>("cups.json", { fixtures: [] }).fixtures];
  const t = now.getTime();
  const near = ours.filter((f) => Math.abs(Date.parse(f.kickoff) - t) < KEEP_MS);

  // Fixtures and absentees, at most every three hours.
  if (!file.fetchedAt || t - Date.parse(file.fetchedAt) >= REFRESH_MS) {
    let mapped = 0;
    for (const d of [day(0), day(1)]) {
      const games = (await api(`fixtures?date=${d}`)) ?? [];
      for (const g of games) {
        const league = LEAGUE[g.league.id];
        if (!league) continue;
        const h = slug(g.teams.home.name);
        const a = slug(g.teams.away.name);
        const kick = Date.parse(g.fixture.date);
        // Same competition, kick-off within three hours, and at least one club recognised.
        const f = near.find((x) => x.league === league && Math.abs(Date.parse(x.kickoff) - kick) < 3 * 3600_000 && (x.home === h || x.away === a));
        if (!f) continue;
        file.matches[f.id] = { ...file.matches[f.id], api: g.fixture.id, homeTeam: g.teams.home.id, awayTeam: g.teams.away.id, kickoff: f.kickoff };
        mapped++;
      }
      const byApi = new Map(Object.entries(file.matches).map(([id, m]) => [m.api, id]));
      const absent = new Map<string, { home: Absent[]; away: Absent[] }>();
      for (const i of (await api(`injuries?date=${d}`)) ?? []) {
        const id = byApi.get(i.fixture.id);
        if (!id) continue;
        const reason: string = i.player.reason ?? "";
        // Squad-registration notes ("Off the roster") are not absences from a fit squad.
        if (/roster/i.test(reason)) continue;
        const m = file.matches[id];
        const side = i.team.id === m.homeTeam ? "home" : i.team.id === m.awayTeam ? "away" : null;
        if (!side) continue;
        const list = absent.get(id) ?? { home: [], away: [] };
        if (!list[side].some((x) => x.name === i.player.name)) list[side].push({ name: i.player.name, kind: i.player.type === "Questionable" ? "doubt" : "out", reason });
        absent.set(id, list);
      }
      for (const [id, list] of absent) file.matches[id].absent = list;
    }
    file.fetchedAt = now.toISOString();
    console.log(`API-FOOTBALL: ${mapped} maç eşleşti, ${Object.values(file.matches).filter((m) => m.absent).length} maçta eksik listesi.`);
  }

  // Line-ups, once each, for games about to start (published about an hour before kick-off).
  const history = load<unknown[]>("lineups-history.json", []);
  let lineups = 0;
  for (const [id, m] of Object.entries(file.matches)) {
    const k = Date.parse(m.kickoff);
    if (m.lineups || k - t > LINEUP_BEFORE_MS || t - k > LINEUP_AFTER_MS) continue;
    const res = await api(`fixtures/lineups?fixture=${m.api}`);
    if (!res || res.length < 2) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const side = (x: any): LineupSide => ({
      formation: x.formation ?? null,
      coach: x.coach?.name ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      xi: x.startXI.map((p: any) => ({ id: p.player.id, name: p.player.name, number: p.player.number ?? null, pos: p.player.pos ?? null })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bench: x.substitutes.map((p: any) => ({ id: p.player.id, name: p.player.name, number: p.player.number ?? null, pos: p.player.pos ?? null })),
    });
    const home = res.find((x) => x.team.id === m.homeTeam) ?? res[0];
    const away = res.find((x) => x.team.id === m.awayTeam) ?? res[1];
    m.lineups = { home: side(home), away: side(away) };
    const f = ours.find((x) => x.id === id)!;
    for (const [s, team] of [["home", f.home], ["away", f.away]] as const)
      history.push({ fixture: id, api: m.api, kickoff: m.kickoff, league: f.league, team, side: s, ...m.lineups[s] });
    lineups++;
  }
  if (lineups) save("lineups-history.json", history);

  // Forget games more than two days old.
  for (const [id, m] of Object.entries(file.matches)) if (t - Date.parse(m.kickoff) > KEEP_MS) delete file.matches[id];
  file.updatedAt = now.toISOString();
  save("squads.json", file);
  console.log(`İlk 11: ${lineups} yeni maç. Bugünkü istek: ${file.quota.used}/${DAILY_CAP}.`);
}

main().catch((err) => {
  // Never block the rest of the bot: keep what we had.
  save("squads.json", file);
  console.error(`Eksikler/ilk 11 alınamadı: ${(err as Error).message}`);
});
