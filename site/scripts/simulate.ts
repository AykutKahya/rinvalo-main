/** Season simulation from the latest predictions. Runs after the prediction engine. */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CUPS, LEAGUES } from "../src/lib/leagues";
import { CUP_PHASE_GAMES, simulateCupPhase, simulateLeague, tieOdds } from "../src/lib/simulate";
import type { Fixture } from "../src/lib/types";
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
// European cups: league-phase odds once every game of the phase is known, and knockout ties.
const cups: { fixtures: Fixture[] } = (() => {
  try {
    return JSON.parse(readFileSync(join(DATA, "cups.json"), "utf8"));
  } catch {
    return { fixtures: [] };
  }
})();
sims.cups = {};
sims.ties = {};
for (const cup of CUPS) {
  const fixtures = cups.fixtures.filter((f) => f.league === cup.code);
  if (fixtures.filter((f) => f.round <= 8).length === CUP_PHASE_GAMES[cup.code]) {
    sims.cups[cup.code] = simulateCupPhase(cup.code, cup.tsdb, fixtures, predictions, sims.runs);
  }
  // Knockout ties: games of one round between the same two clubs.
  const ko = new Map<string, Fixture[]>();
  for (const f of fixtures.filter((x) => x.round > 8)) {
    const key = `${cup.code}-${f.round}-${[f.home, f.away].sort().join("-")}`;
    ko.set(key, [...(ko.get(key) ?? []), f].sort((a, b) => a.kickoff.localeCompare(b.kickoff)));
  }
  for (const [key, legs] of ko) {
    const first = legs[0].home;
    const p = tieOdds(legs.map((l) => ({ ...l, p: predictions[l.id] })), first, sims.runs, key.length * 97);
    if (p !== null) for (const l of legs) sims.ties[l.id] = { first, second: legs[0].away, p };
  }
}
writeFileSync(join(DATA, "simulation.json"), JSON.stringify(sims) + "\n");
console.log(`Simülasyon: ${Object.keys(sims.leagues).length} lig`);
