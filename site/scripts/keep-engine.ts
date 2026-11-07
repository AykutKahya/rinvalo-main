/**
 * Runs only when the Rinvalo engine failed. `npm run update` has already replaced every upcoming
 * game's prediction with the simple fallback model; this puts back the engine's last prediction
 * wherever there was one, so a broken engine leaves predictions a few hours old instead of worse.
 *
 *   tsx scripts/keep-engine.ts <snapshot dir>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MODEL_VERSION } from "../src/lib/model";
import type { PredictionsFile } from "../src/lib/types";

const before: PredictionsFile = JSON.parse(readFileSync(join(process.argv[2], "data", "predictions.json"), "utf8"));
const path = join(import.meta.dirname, "../data/predictions.json");
const now: PredictionsFile = JSON.parse(readFileSync(path, "utf8"));
let kept = 0;
for (const [id, p] of Object.entries(now.predictions)) {
  const old = before.predictions[id];
  if (p.model === MODEL_VERSION && old && old.model !== MODEL_VERSION) {
    now.predictions[id] = old;
    kept++;
  }
}
writeFileSync(path, JSON.stringify(now) + "\n");
console.log(`Motor başarısız: ${kept} maçta önceki motor tahmini korundu.`);
