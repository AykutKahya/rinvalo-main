/**
 * Rinvalo botu. Tek koşuda:
 *  1. Fikstür ve sonuçları TheSportsDB'den çeker (eksik skorları openfootball'dan tamamlar)
 *  2. data/overrides.json içindeki elle düzeltmeleri uygular
 *  3. Başlamamış her maç için tahmini yeniler; başlamış maçın tahmini dondurulur
 *  4. Sezon simülasyonunu çalıştırır
 *
 *   npm run update              -> yakın haftaları günceller
 *   FULL=1 npm run update       -> bütün sezonu baştan çeker
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LEAGUES, SEASON, type League } from "../src/lib/leagues";
import { fit, predict, type ModelMatch } from "../src/lib/model";
import type { Fixture, HistoryFile, OverridesFile, PredictionsFile, SeasonFile } from "../src/lib/types";
import { fetchOpenfootball } from "./sources/openfootball";
import { fetchRound } from "./sources/thesportsdb";

const DATA = join(import.meta.dirname, "../data");
const PUBLIC = join(import.meta.dirname, "../public");
const DAY = 86_400_000;
const now = new Date(process.env.RINVALO_NOW ?? Date.now());
const full = process.env.FULL === "1";

function load<T>(name: string, fallback: T): T {
  const path = join(DATA, name);
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : fallback;
}
function save(name: string, value: unknown) {
  writeFileSync(join(DATA, name), JSON.stringify(value, null, name === "overrides.json" ? 2 : 0) + "\n");
}

const history = load<HistoryFile>("history.json", { source: "", matches: [] });
const season = load<SeasonFile>("season.json", { season: SEASON, updatedAt: "", sources: {}, fixtures: [] });
const overrides = load<OverridesFile>("overrides.json", { results: {}, kickoffs: {}, postponed: [] });
const predictions = load<PredictionsFile>("predictions.json", { model: "", predictions: {} });

const byId = new Map(season.fixtures.map((f) => [f.id, f]));
const badgeUrls = new Map<string, string>();
const leagueBadgeUrls = new Map<string, string>();

function roundsToFetch(league: League): number[] {
  const mine = season.fixtures.filter((f) => f.league === league.code);
  if (full || mine.length === 0) return Array.from({ length: league.rounds }, (_, i) => i + 1);
  const t = now.getTime();
  const rounds = new Set<number>();
  for (const f of mine) {
    const k = Date.parse(f.kickoff);
    const near = k > t - 5 * DAY && k < t + 10 * DAY;
    const overdue = f.status !== "finished" && k < t && k > t - 45 * DAY;
    if (near || overdue) rounds.add(f.round);
  }
  if (rounds.size) {
    const max = Math.max(...rounds);
    if (max < league.rounds) rounds.add(max + 1);
  } else {
    const next = mine.filter((f) => Date.parse(f.kickoff) > t).sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0];
    if (next) rounds.add(next.round);
  }
  return [...rounds].sort((a, b) => a - b);
}

function merge(incoming: Fixture) {
  const old = byId.get(incoming.id);
  // A source glitch must not erase a result we already have.
  if (old?.status === "finished" && incoming.status !== "finished") {
    byId.set(incoming.id, { ...incoming, status: "finished", hg: old.hg, ag: old.ag, source: old.source });
    return;
  }
  byId.set(incoming.id, incoming);
}

/**
 * Logos are copied into public/ once, so the site never loads images from another host.
 * Only missing files are downloaded; data/crests.json lists what is available.
 */
async function downloadLogos() {
  const jobs: [string, string][] = [];
  for (const [slug, url] of badgeUrls) jobs.push([join(PUBLIC, "crests", `${slug}.png`), url]);
  for (const [code, url] of leagueBadgeUrls) jobs.push([join(PUBLIC, "leagues", `${code}.png`), url]);
  let fetched = 0;
  for (const [path, url] of jobs) {
    if (existsSync(path)) continue;
    try {
      const res = await fetch(`${url}/small`, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) continue;
      mkdirSync(join(path, ".."), { recursive: true });
      writeFileSync(path, Buffer.from(await res.arrayBuffer()));
      fetched++;
    } catch {
      // A missing logo falls back to the club-colour badge.
    }
  }
  const list = (dir: string) => (existsSync(join(PUBLIC, dir)) ? readdirSync(join(PUBLIC, dir)).filter((f) => f.endsWith(".png")).map((f) => f.slice(0, -4)).sort() : []);
  save("crests.json", { teams: list("crests"), leagues: list("leagues") });
  if (fetched) console.log(`${fetched} logo indirildi`);
}

async function main() {
  let anyOk = false;

  for (const league of LEAGUES) {
    const rounds = roundsToFetch(league);
    const unknown = new Set<string>();
    let fetched = 0;
    let failed = 0;
    for (const r of rounds) {
      try {
        const res = await fetchRound(league, r);
        res.fixtures.forEach(merge);
        res.unknownTeams.forEach((n) => unknown.add(n));
        Object.entries(res.badges).forEach(([slug, url]) => badgeUrls.set(slug, url));
        if (res.leagueBadge) leagueBadgeUrls.set(league.code, res.leagueBadge);
        fetched += res.fixtures.length;
      } catch (err) {
        failed++;
        console.error(`[${league.code}] ${r}. hafta alınamadı: ${(err as Error).message}`);
      }
    }
    const ok = failed < rounds.length;
    anyOk ||= ok;
    const parts = [`${rounds.length} hafta, ${fetched} maç`];
    if (failed) parts.push(`${failed} hafta alınamadı`);
    if (unknown.size) parts.push(`tanınmayan takım: ${[...unknown].join(", ")}`);
    season.sources[`thesportsdb:${league.code}`] = { ok, at: now.toISOString(), message: parts.join(" · ") };
    console.log(`[${league.code}] ${parts.join(" · ")}`);

    // Fallback: fill results the primary source has not delivered yet.
    const missing = [...byId.values()].filter(
      (f) => f.league === league.code && f.status !== "finished" && f.status !== "postponed" && Date.parse(f.kickoff) < now.getTime() - 3 * 3600_000,
    );
    if (league.openfootball && missing.length) {
      try {
        const results = new Map((await fetchOpenfootball(league)).map((r) => [r.id, r]));
        let filled = 0;
        for (const f of missing) {
          const r = results.get(f.id);
          if (!r) continue;
          byId.set(f.id, { ...f, status: "finished", hg: r.hg, ag: r.ag, source: "openfootball" });
          filled++;
        }
        season.sources[`openfootball:${league.code}`] = { ok: true, at: now.toISOString(), message: `${filled}/${missing.length} eksik skor tamamlandı` };
      } catch (err) {
        season.sources[`openfootball:${league.code}`] = { ok: false, at: now.toISOString(), message: (err as Error).message };
      }
    }
  }

  await downloadLogos();

  // Manual corrections always win.
  for (const [id, iso] of Object.entries(overrides.kickoffs)) {
    const f = byId.get(id);
    if (f) byId.set(id, { ...f, kickoff: new Date(iso).toISOString() });
  }
  for (const id of overrides.postponed) {
    const f = byId.get(id);
    if (f && f.status !== "finished") byId.set(id, { ...f, status: "postponed" });
  }
  for (const [id, r] of Object.entries(overrides.results)) {
    const f = byId.get(id);
    if (f) byId.set(id, { ...f, status: "finished", hg: r.hg, ag: r.ag, source: "manual" });
  }

  season.fixtures = [...byId.values()].sort((a, b) => a.kickoff.localeCompare(b.kickoff) || a.id.localeCompare(b.id));
  season.updatedAt = now.toISOString();

  // Fallback predictions from the simple TypeScript model. The Python engine (engine/predict.py)
  // runs next and replaces them; if it fails, these keep the site supplied. Started matches stay frozen.
  let refreshed = 0;
  for (const league of LEAGUES) {
    const fixtures = season.fixtures.filter((f) => f.league === league.code);
    if (!fixtures.length) continue;
    const past = history.matches.filter((m) => m[0] === league.code);
    const lastSeason = past.length ? past[past.length - 1][1] : "";
    const established = new Set(past.filter((m) => m[1] === lastSeason).flatMap((m) => [m[3], m[4]]));
    const pool: ModelMatch[] = [
      ...past.map((m) => ({ date: m[2], home: m[3], away: m[4], hg: m[5], ag: m[6] })),
      ...fixtures
        .filter((f) => f.status === "finished")
        .map((f) => ({ date: f.kickoff.slice(0, 10), home: f.home, away: f.away, hg: f.hg!, ag: f.ag! })),
    ];
    const model = fit(pool, now, established);
    for (const f of fixtures) {
      const notStarted = Date.parse(f.kickoff) > now.getTime() && f.status === "scheduled";
      const pending = f.status === "postponed";
      if (notStarted || pending) {
        predictions.predictions[f.id] = predict(model, f.home, f.away, f.id, now);
        refreshed++;
      }
    }
  }
  predictions.model = Object.values(predictions.predictions)[0]?.model ?? "";

  save("season.json", season);
  save("predictions.json", predictions);
  if (!existsSync(join(DATA, "overrides.json"))) save("overrides.json", overrides);

  const finished = season.fixtures.filter((f) => f.status === "finished").length;
  console.log(`Toplam ${season.fixtures.length} maç (${finished} bitti) · ${refreshed} tahmin güncellendi`);
  if (!anyOk) {
    console.error("Hiçbir ligden veri alınamadı.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
