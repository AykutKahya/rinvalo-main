import { getMatches } from "./data";
import { CUPS, LEAGUES, TSDB_SEASON } from "./leagues";
import { resolveTeam } from "./teams";

export type LiveScore = { status: "live" | "finished" | "scheduled"; hg: number | null; ag: number | null };

const KEY = process.env.THESPORTSDB_KEY || "123";
const TSDB: Record<string, number> = Object.fromEntries([...LEAGUES, ...CUPS].map((c) => [c.code, c.tsdb]));

type Event = { strHomeTeam: string; strAwayTeam: string; intHomeScore: string | null; intAwayScore: string | null; strStatus: string | null; intRound: string | null };

/**
 * Current scores of games that are under way (kicked off up to 3 hours ago). One request per
 * league round in play; the route that serves this is cached for a minute, so the source sees a
 * few requests per minute however many people are watching.
 */
export async function fetchLive(now = Date.now()): Promise<Record<string, LiveScore>> {
  const active = getMatches().filter((m) => {
    const k = Date.parse(m.kickoff);
    return m.status !== "finished" && m.status !== "postponed" && k < now + 5 * 60_000 && k > now - 3 * 3600_000;
  });
  const rounds = new Map<string, { league: string; round: number }>();
  for (const m of active) rounds.set(`${m.league}:${m.round}`, { league: m.league, round: m.round });
  const wanted = new Map(active.map((m) => [`${m.league}:${m.round}:${m.home}:${m.away}`, m.id]));
  const out: Record<string, LiveScore> = {};
  await Promise.all(
    [...rounds.values()].map(async ({ league, round }) => {
      try {
        const res = await fetch(`https://www.thesportsdb.com/api/v1/json/${KEY}/eventsround.php?id=${TSDB[league]}&r=${round}&s=${TSDB_SEASON}`, {
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
        });
        if (!res.ok) return;
        const { events } = (await res.json()) as { events: Event[] | null };
        for (const e of events ?? []) {
          const home = resolveTeam(e.strHomeTeam);
          const away = resolveTeam(e.strAwayTeam);
          const id = home && away ? wanted.get(`${league}:${round}:${home}:${away}`) : undefined;
          if (!id) continue;
          const s = (e.strStatus ?? "").toLowerCase();
          const scored = e.intHomeScore !== null && e.intHomeScore !== "" && e.intAwayScore !== null && e.intAwayScore !== "";
          const status = /^(ft|aet|pen|match finished|finished)/.test(s) ? "finished" : /^(1h|2h|ht|et|live|p)$/.test(s) || scored ? "live" : "scheduled";
          out[id] = { status, hg: scored ? Number(e.intHomeScore) : null, ag: scored ? Number(e.intAwayScore) : null };
        }
      } catch {}
    }),
  );
  return out;
}
