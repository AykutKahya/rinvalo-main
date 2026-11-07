/**
 * TheSportsDB, ücretsiz herkese açık anahtar ("123"). Üyelik ve ödeme gerektirmez.
 * Ücretsiz katman dakikada ~30 isteğe izin verir; istekler arasında bekleriz.
 */
import type { League } from "../../src/lib/leagues";
import { fixtureId, TSDB_SEASON } from "../../src/lib/leagues";
import { resolveTeam } from "../../src/lib/teams";
import type { Fixture, FixtureStatus } from "../../src/lib/types";

const KEY = process.env.THESPORTSDB_KEY || "123";
export const BASE = `https://www.thesportsdb.com/api/v1/json/${KEY}`;
const GAP_MS = 2200;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let last = 0;

export async function getJson(url: string): Promise<unknown> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = last + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    try {
      const res = await fetch(url, { headers: { "user-agent": "rinvalo-bot/2" }, signal: AbortSignal.timeout(20_000) });
      if (res.status === 429 || res.status >= 500) {
        await sleep(5000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === 3) throw err;
      await sleep(3000 * (attempt + 1));
    }
  }
  throw new Error("TheSportsDB yanıt vermedi");
}

export interface TsdbEvent {
  idEvent: string;
  intRound: string | null;
  strTimestamp: string | null;
  dateEvent: string | null;
  strTime: string | null;
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus: string | null;
  strPostponed: string | null;
  strVenue: string | null;
  strHomeTeamBadge?: string | null;
  strAwayTeamBadge?: string | null;
  strLeagueBadge?: string | null;
}

export function status(e: TsdbEvent, hasScore: boolean, kickoff: number): FixtureStatus {
  const s = (e.strStatus ?? "").toLowerCase();
  if (e.strPostponed === "yes" || /postp|pst|canc|abd|susp/.test(s)) return "postponed";
  if (/^(ft|aet|pen|match finished|finished)/.test(s) && hasScore) return "finished";
  if (/^(1h|2h|ht|et|live|p)$/.test(s)) return "live";
  // Some finished events keep "NS" for a while; trust a score once the match is clearly over.
  if (hasScore && Date.now() > kickoff + 2.5 * 3600_000) return "finished";
  return "scheduled";
}

export interface RoundResult {
  fixtures: Fixture[];
  unknownTeams: string[];
  /** Badge image URLs by team slug, as published by TheSportsDB. */
  badges: Record<string, string>;
  leagueBadge: string | null;
}

export async function fetchRound(league: League, round: number): Promise<RoundResult> {
  const data = (await getJson(`${BASE}/eventsround.php?id=${league.tsdb}&r=${round}&s=${TSDB_SEASON}`)) as {
    events: TsdbEvent[] | null;
  };
  const fixtures: Fixture[] = [];
  const unknownTeams: string[] = [];
  const badges: Record<string, string> = {};
  let leagueBadge: string | null = null;
  for (const e of data.events ?? []) {
    const home = resolveTeam(e.strHomeTeam);
    const away = resolveTeam(e.strAwayTeam);
    if (!home) unknownTeams.push(e.strHomeTeam);
    if (!away) unknownTeams.push(e.strAwayTeam);
    if (!home || !away) continue;
    if (e.strHomeTeamBadge) badges[home] = e.strHomeTeamBadge;
    if (e.strAwayTeamBadge) badges[away] = e.strAwayTeamBadge;
    if (e.strLeagueBadge) leagueBadge = e.strLeagueBadge;
    const ts = e.strTimestamp ?? (e.dateEvent ? `${e.dateEvent}T${e.strTime ?? "12:00:00"}` : null);
    if (!ts) continue;
    const kickoff = new Date(ts.endsWith("Z") || ts.includes("+") ? ts : `${ts}Z`);
    const hasScore = e.intHomeScore !== null && e.intHomeScore !== "" && e.intAwayScore !== null && e.intAwayScore !== "";
    const st = status(e, hasScore, kickoff.getTime());
    fixtures.push({
      id: fixtureId(home, away),
      league: league.code,
      round: Number(e.intRound ?? round) || round,
      kickoff: kickoff.toISOString(),
      home,
      away,
      venue: e.strVenue || null,
      status: st,
      hg: st === "finished" || st === "live" ? Number(e.intHomeScore) : null,
      ag: st === "finished" || st === "live" ? Number(e.intAwayScore) : null,
      source: st === "finished" ? "thesportsdb" : null,
    });
  }
  return { fixtures, unknownTeams, badges, leagueBadge };
}

/** Raw events of one round of any competition and season ("2026-2027"). */
export async function fetchEvents(tsdbId: number, round: number, season: string): Promise<TsdbEvent[]> {
  const data = (await getJson(`${BASE}/eventsround.php?id=${tsdbId}&r=${round}&s=${season}`)) as { events: TsdbEvent[] | null };
  return data.events ?? [];
}
