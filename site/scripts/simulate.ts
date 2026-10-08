/** Season simulation from the latest predictions. Runs after the prediction engine. */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LEAGUES } from "../src/lib/leagues";
import { simulateLeague } from "../src/lib/simulate";
import type { PredictionsFile, SeasonFile, SimulationFile } from "../src/lib/types";

const DATA = join(import.meta.dirname, "../data");
const season: SeasonFile = JSON.parse(readFileSync(join(DATA, "season.json"), "utf8"));
const { predictions }: PredictionsFile = JSON.parse(readFileSync(join(DATA, "predictions.json"), "utf8"));
const now = Date.parse(process.env.RINVALO_NOW ?? new Date().toISOString());
const sims: SimulationFile = { updatedAt: new Date(now).toISOString(), runs: 5000, leagues: {}, impact: {} };
for (const league of LEAGUES) {
  const fixtures = season.fixtures.filter((f) => f.league === league.code);
  if (!fixtures.length) continue;
  // Stakes only for games of the next two weeks.
  const focus = new Set(fixtures.filter((f) => f.status === "scheduled" && Date.parse(f.kickoff) > now && Date.parse(f.kickoff) < now + 14 * 86_400_000).map((f) => f.id));
  const { outlook, impact } = simulateLeague(league, fixtures, predictions, sims.runs, focus);
  sims.leagues[league.code] = outlook;
  Object.assign(sims.impact!, impact);
}
writeFileSync(join(DATA, "simulation.json"), JSON.stringify(sims) + "\n");
console.log(`Simülasyon: ${Object.keys(sims.leagues).length} lig`);
