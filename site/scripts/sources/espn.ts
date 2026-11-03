/**
 * ESPN's public scoreboard (no key), used to fill European cup games TheSportsDB misses.
 *
 * TheSportsDB's free key returns at most 50 games per round, and the Conference League files its
 * qualifiers under the same round numbers as the league phase, so league-phase matchdays 1-3 never
 * arrive. One request per match day fills them in, spaced out.
 */
const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const GAP_MS = 1500;

/** ESPN league keys of the cups we cover. */
export const ESPN_LEAGUE: Record<string, string> = { ucl: "uefa.champions", uel: "uefa.europa", uecl: "uefa.europa.conf" };

export interface EspnGame {
  kickoff: Date;
  home: string;
  away: string;
  hg: number | null;
  ag: number | null;
  state: "pre" | "in" | "post";
  completed: boolean;
  venue: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let last = 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function get(url: string): Promise<any> {
  const wait = last + GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  // ESPN refuses unfamiliar user agents; the runtime's default is accepted.
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** The league phase's first and last day, from the competition calendar. */
export async function leaguePhase(cup: string): Promise<[string, string] | null> {
  const body = await get(`${BASE}/${ESPN_LEAGUE[cup]}/scoreboard`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entry = body.leagues?.[0]?.calendar?.[0]?.entries?.find((e: any) => /league phase/i.test(e.label ?? ""));
  return entry ? [entry.startDate.slice(0, 10), entry.endDate.slice(0, 10)] : null;
}

/** League-phase games on one UTC day (YYYY-MM-DD). */
export async function gamesOn(cup: string, day: string): Promise<EspnGame[]> {
  const body = await get(`${BASE}/${ESPN_LEAGUE[cup]}/scoreboard?dates=${day.replace(/-/g, "")}`);
  const out: EspnGame[] = [];
  for (const e of body.events ?? []) {
    if (e.season?.slug && e.season.slug !== "league-phase") continue;
    const c = e.competitions?.[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const side = (s: string) => c?.competitors?.find((t: any) => t.homeAway === s);
    const h = side("home");
    const a = side("away");
    if (!h || !a) continue;
    const type = e.status?.type ?? {};
    const started = type.state === "in" || type.state === "post";
    out.push({
      kickoff: new Date(e.date),
      home: h.team.displayName,
      away: a.team.displayName,
      hg: started && h.score != null ? Number(h.score) : null,
      ag: started && a.score != null ? Number(a.score) : null,
      state: type.state ?? "pre",
      completed: Boolean(type.completed),
      venue: c.venue?.fullName ?? null,
    });
  }
  return out;
}
