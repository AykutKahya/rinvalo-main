/** Season simulation from the latest predictions. Runs after the prediction engine. */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LEAGUES } from "../src/lib/leagues";
import { simulateLeague } from "../src/lib/simulate";
import type { PredictionsFile, SeasonFile, SimulationFile } from "../src/lib/types";

const DATA = join(import.meta.dirname, "../data");
const season: SeasonFile = JSON.parse(readFileSync(join(DATA, "season.json"), "utf8"));
const { predictions }: PredictionsFile = JSON.parse(readFileSync(join(DATA, "predictions.json"), "utf8"));
const sims: SimulationFile = { updatedAt: new Date().toISOString(), runs: 5000, leagues: {} };
for (const league of LEAGUES) {
  const fixtures = season.fixtures.filter((f) => f.league === league.code);
  if (fixtures.length) sims.leagues[league.code] = simulateLeague(league, fixtures, predictions, sims.runs);
}
writeFileSync(join(DATA, "simulation.json"), JSON.stringify(sims) + "\n");
console.log(`Simülasyon: ${Object.keys(sims.leagues).length} lig`);
