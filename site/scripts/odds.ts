/**
 * Pre-match market prices from MoviOdds (free, no key): full-time result, over/under 2.5 and
 * both teams to score, for every league and cup game we cover that is on the board.
 *
 * One small request per run (only the three markets, gzip). The prices are used as margin-free
 * probabilities (the market's view), never shown as bookmaker odds.
 *
 *   tsx scripts/odds.ts   -> data/odds-moviodds.json  { fixtureId: [h, d, a, over, under, yes, no] }
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveTeam } from "../src/lib/teams";
import type { Fixture } from "../src/lib/types";

const DATA = join(import.meta.dirname, "../data");
const URL = "https://moviodds.com/odds?groups=40,981,10150";

/** MoviOdds competition names of the competitions we cover. */
const LEAGUE: Record<string, string> = {
  "Türkiye Super Lig": "super-lig",
  "England Premier League": "premier-league",
  "Spain La Liga": "la-liga",
  "Italy Serie A": "serie-a",
  "Germany Bundesliga I": "bundesliga",
  "France Ligue 1": "ligue-1",
  "Netherlands Eredivisie": "eredivisie",
  "Portugal Primeira Liga": "primeira-liga",
  "England Championship": "championship",
  "UEFA Champions League": "ucl",
  "UEFA Europa League": "uel",
  "UEFA Conference League": "uecl",
};

interface Quote {
  group_id: string;
  label?: string | null;
  n2?: string;
  side?: string | null;
  line?: string | null;
  odds_dec: number;
}
interface Game {
  home: string;
  away: string;
  league: string;
  in_play: boolean;
  kickoff_utc: string;
  quotes: Quote[];
}

const load = <T>(name: string, fallback: T): T => (existsSync(join(DATA, name)) ? (JSON.parse(readFileSync(join(DATA, name), "utf8")) as T) : fallback);
const good = (x: number | undefined): x is number => typeof x === "number" && Number.isFinite(x) && x > 1;
const r = (x: number) => Math.round(x * 1000) / 1000;

async function main() {
  const res = await fetch(URL, { headers: { "Accept-Encoding": "gzip" }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as { matches?: Game[]; warming?: boolean };
  if (body.warming || !body.matches?.length) throw new Error("tahta henüz hazır değil");

  const now = Date.now();
  const ours = [...load<{ fixtures: Fixture[] }>("season.json", { fixtures: [] }).fixtures, ...load<{ fixtures: Fixture[] }>("cups.json", { fixtures: [] }).fixtures].filter(
    (f) => f.status === "scheduled" && Date.parse(f.kickoff) > now - 3 * 3600_000,
  );
  // Keep what we already had for games still to come: a market that is pulled before kick-off keeps its last price.
  const out = Object.fromEntries(Object.entries(load<Record<string, number[]>>("odds-moviodds.json", {})).filter(([id]) => ours.some((f) => f.id === id)));

  let seen = 0;
  const unknown = new Set<string>();
  for (const g of body.matches) {
    const league = LEAGUE[g.league];
    if (!league || g.in_play) continue;
    seen++;
    const h = resolveTeam(g.home);
    const a = resolveTeam(g.away);
    if (!h) unknown.add(g.home);
    if (!a) unknown.add(g.away);
    const kick = Date.parse(g.kickoff_utc);
    // Same competition, kick-off within three hours, and at least one club recognised.
    const f = ours.find((x) => x.league === league && Math.abs(Date.parse(x.kickoff) - kick) < 3 * 3600_000 && (x.home === h || x.away === a));
    if (!f) continue;

    const q = (group: string) => g.quotes.filter((x) => x.group_id === group && good(x.odds_dec));
    const ft = q("40");
    const side = (n: string, i: number) => (ft.find((x) => x.n2 === n) ?? ft[i])?.odds_dec;
    const oh = side("1", 0);
    const od = ft.find((x) => x.n2 === "X" || x.label === "Draw")?.odds_dec;
    const oa = side("2", 2);
    if (ft.length !== 3 || !good(oh) || !good(od) || !good(oa)) continue;
    const ou = q("981").filter((x) => x.line === "2.5");
    const over = ou.find((x) => x.side === "Over")?.odds_dec ?? null;
    const under = ou.find((x) => x.side === "Under")?.odds_dec ?? null;
    const bt = q("10150");
    const yes = bt.find((x) => x.label === "Yes")?.odds_dec ?? null;
    const no = bt.find((x) => x.label === "No")?.odds_dec ?? null;
    out[f.id] = [oh, od, oa, over, under, yes, no].map((x) => (x == null ? null : r(x))) as number[];
  }

  writeFileSync(join(DATA, "odds-moviodds.json"), JSON.stringify(out) + "\n");
  console.log(`MoviOdds: ${seen} maç tahtada, ${Object.keys(out).length} maçın oranı kayıtlı.`);
  if (unknown.size) console.log(`Tanınmayan takım adları: ${[...unknown].join(", ")}`);
}

main().catch((err) => console.error(`MoviOdds oranları alınamadı: ${(err as Error).message}`));
