/**
 * Fetches the bot's latest output from Supabase Storage into data/ and public/ (crests, league logos).
 * Runs before every Vercel build and at the start of every bot run. The copies in git are only a seed.
 *
 *   node scripts/pull-data.mjs            -> keeps the git copy when Storage cannot be reached
 *   node scripts/pull-data.mjs --strict   -> fails instead (the bot must not build on stale data)
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const strict = process.argv.includes("--strict");
/** Hand-edited in git (manual score fixes); Storage never holds it. */
const GIT_ONLY = new Set(["overrides.json"]);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const headers = { apikey: key, authorization: `Bearer ${key}` };

function give(message) {
  if (strict) {
    console.error(message);
    process.exit(1);
  }
  console.warn(`${message} · git'teki veri kullanılıyor.`);
  process.exit(0);
}

if (!url || !key) give("Supabase ortam değişkenleri yok");

async function get(path) {
  const res = await fetch(`${url}/storage/v1/object/site/${path}`, { headers, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

try {
  const res = await fetch(`${url}/storage/v1/object/list/site`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ prefix: "data/", limit: 1000 }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`liste: ${res.status}`);
  const names = (await res.json()).map((o) => o.name).filter((n) => n.endsWith(".json") && !GIT_ONLY.has(n));
  if (names.length === 0) throw new Error("Storage'da veri yok");

  const files = await Promise.all(names.map(async (n) => [n, await get(`data/${n}`)]));
  const assets = await get("assets.tar.gz").catch(() => null);

  // Write only after every download succeeded, so a half-fetched set never mixes with the seed.
  mkdirSync("data", { recursive: true });
  for (const [n, body] of files) writeFileSync(join("data", n), body);
  if (assets) execFileSync("tar", ["-xzf", "-", "-C", "public"], { input: assets });
  console.log(`Storage'dan ${files.length} veri dosyası${assets ? " ve logolar" : ""} alındı.`);
} catch (err) {
  give(`Veri alınamadı: ${err.message}`);
}
