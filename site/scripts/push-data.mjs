/**
 * Uploads the bot's output to Supabase Storage, but only what really changed: a file whose only
 * difference is a timestamp stays as it is, so the site is not rebuilt for nothing.
 *
 *   node scripts/push-data.mjs snapshot <dir>   -> remembers data/ and the logos before the run
 *   node scripts/push-data.mjs push <dir>       -> uploads the changes; prints changed=true|false
 *
 * Needs SUPABASE_URL and RINVALO_UPLOAD_TOKEN. Writes changed=… to $GITHUB_OUTPUT when set.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [mode, dir] = process.argv.slice(2);
const ASSETS = ["crests", "leagues"];
const VOLATILE = new Set(["updatedAt", "at", "madeAt"]);
/** Hand-edited in git (manual score fixes); never uploaded. */
const GIT_ONLY = new Set(["overrides.json"]);

/** One hash over every logo file, to tell whether the archive needs uploading. */
function assetsHash() {
  const h = createHash("sha256");
  for (const sub of ASSETS) {
    const folder = join("public", sub);
    if (!existsSync(folder)) continue;
    for (const name of readdirSync(folder).sort()) h.update(`${sub}/${name}\0`).update(readFileSync(join(folder, name)));
  }
  return h.digest("hex");
}

function strip(v) {
  if (Array.isArray(v)) return v.map(strip);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).filter(([k]) => !VOLATILE.has(k)).map(([k, x]) => [k, strip(x)]));
  return v;
}

function same(name) {
  const before = join(dir, "data", name);
  if (!existsSync(before)) return false;
  try {
    return JSON.stringify(strip(JSON.parse(readFileSync(before, "utf8")))) === JSON.stringify(strip(JSON.parse(readFileSync(join("data", name), "utf8"))));
  } catch {
    return false;
  }
}

async function upload(path, body) {
  const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/upload?path=${encodeURIComponent(path)}`, {
    method: "POST",
    headers: { "x-upload-token": process.env.RINVALO_UPLOAD_TOKEN ?? "" },
    body,
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
}

if (mode === "snapshot") {
  mkdirSync(dir, { recursive: true });
  cpSync("data", join(dir, "data"), { recursive: true });
  writeFileSync(join(dir, "assets.sha"), assetsHash());
} else if (mode === "push") {
  if (!process.env.SUPABASE_URL || !process.env.RINVALO_UPLOAD_TOKEN) throw new Error("SUPABASE_URL ve RINVALO_UPLOAD_TOKEN gerekli");
  const changed = readdirSync("data").filter((n) => n.endsWith(".json") && !GIT_ONLY.has(n) && !same(n));
  // Upload the small files first and the big ones last; the site reads them as one set at build time.
  changed.sort((a, b) => readFileSync(join("data", a)).length - readFileSync(join("data", b)).length);
  for (const name of changed) {
    await upload(`data/${name}`, readFileSync(join("data", name)));
    console.log(`yüklendi: data/${name}`);
  }
  const logos = assetsHash() !== readFileSync(join(dir, "assets.sha"), "utf8");
  if (logos) {
    await upload("assets.tar.gz", execFileSync("tar", ["-czf", "-", "-C", "public", ...ASSETS], { maxBuffer: 256 * 1024 * 1024 }));
    console.log("yüklendi: assets.tar.gz");
  }
  const any = changed.length > 0 || logos;
  console.log(any ? "Değişiklik yüklendi." : "Yalnız zaman damgaları değişti; yükleme yok.");
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${any}\n`);
} else {
  console.error("kullanım: push-data.mjs snapshot|push <dir>");
  process.exit(2);
}
