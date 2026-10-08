import type { MatchView } from "./data";
import type { SimulationFile } from "./types";

const DAY = 86_400_000;

export function upcoming(matches: MatchView[], now: number, days: number): MatchView[] {
  return matches.filter((m) => m.status === "scheduled" && m.prediction && Date.parse(m.kickoff) > now && Date.parse(m.kickoff) < now + days * DAY);
}

/** Match of the week: the two strongest sides by projected finish, closest contest breaks ties. */
export function matchOfTheWeek(matches: MatchView[], sim: SimulationFile, now: number): MatchView | undefined {
  const pos = new Map<string, number>();
  for (const rows of Object.values(sim.leagues)) rows.forEach((r) => pos.set(r.team, r.avgPosition));
  const pool = upcoming(matches, now, 7);
  const score = (m: MatchView) => (pos.get(m.home) ?? 10) + (pos.get(m.away) ?? 10) + Math.max(...m.prediction!.p) * 4;
  return [...pool].sort((a, b) => score(a) - score(b))[0];
}

export function surestPicks(matches: MatchView[], now: number, n = 3): MatchView[] {
  return [...upcoming(matches, now, 4)].sort((a, b) => Math.max(...b.prediction!.p) - Math.max(...a.prediction!.p)).slice(0, n);
}

export function closestPicks(matches: MatchView[], now: number, n = 3): MatchView[] {
  return [...upcoming(matches, now, 4)].sort((a, b) => Math.max(...a.prediction!.p) - Math.max(...b.prediction!.p)).slice(0, n);
}

export function recentResults(matches: MatchView[], now: number, days = 7): MatchView[] {
  return matches
    .filter((m) => m.hit !== null && Date.parse(m.kickoff) > now - days * DAY && Date.parse(m.kickoff) <= now)
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff));
}

/** Drop the heavy probability grid for list views sent to the browser. */
export function lite(m: MatchView): MatchView {
  return m.prediction ? { ...m, prediction: { ...m.prediction, grid: [], top: [] } } : m;
}
