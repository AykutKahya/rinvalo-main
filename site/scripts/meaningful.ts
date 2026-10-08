/**
 * Exit 0 when data/ holds a real change (a score, a new fixture, a different prediction), 1 when
 * only timestamps moved. The bot commits only real changes, so the site is not rebuilt for nothing.
 *
 *   tsx scripts/meaningful.ts
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const VOLATILE = new Set(["updatedAt", "at", "madeAt"]);

function strip(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(strip);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v)
        .filter(([k]) => !VOLATILE.has(k))
        .map(([k, x]) => [k, strip(x)]),
    );
  return v;
}

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
// Porcelain paths are relative to the repository root.
const root = git("rev-parse", "--show-toplevel").trim();
const status = git("status", "--porcelain", "--", "data", "public/crests", "public/leagues").split("\n").filter(Boolean);

try {
  for (const line of status) {
    const path = line.slice(3).trim();
    // New or deleted files (a new crest, a new data file) always count.
    if (!line.startsWith(" M") && !line.startsWith("M")) {
      console.log(`değişti: ${path}`);
      process.exit(0);
    }
    if (!path.endsWith(".json")) {
      console.log(`değişti: ${path}`);
      process.exit(0);
    }
    const before = JSON.stringify(strip(JSON.parse(git("show", `HEAD:${path}`))));
    const after = JSON.stringify(strip(JSON.parse(readFileSync(join(root, path), "utf8"))));
    if (before !== after) {
      console.log(`değişti: ${path}`);
      process.exit(0);
    }
  }
} catch (err) {
  // When in doubt, commit.
  console.warn((err as Error).message);
  process.exit(0);
}
console.log("Yalnız zaman damgaları değişti.");
process.exit(1);
