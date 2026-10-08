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

const top = (p: [number, number, number]) => p.indexOf(Math.max(...p));

/** Results of the latest matchday that the model gave the smallest chance, biggest shock first. */
export function shocks(matches: MatchView[], now: number, n = 6) {
  const done = matches.filter((m) => m.prediction && m.status === "finished" && m.hg !== null && Date.parse(m.kickoff) <= now);
  const latest = Math.max(0, ...done.map((m) => Date.parse(m.kickoff)));
  return done
    .filter((m) => Date.parse(m.kickoff) > latest - 4 * DAY)
    .map((m) => {
      const o = m.hg! > m.ag! ? 0 : m.hg === m.ag ? 1 : 2;
      return { m, chance: m.prediction!.p[o] };
    })
    .filter((s) => s.chance < 0.3)
    .sort((a, b) => a.chance - b.chance)
    .slice(0, n);
}

/** Upcoming games where Rinvalo and the betting market back different results. */
export function disagreements(matches: MatchView[], now: number, days = 10) {
  return upcoming(matches, now, days)
    .filter((m) => m.prediction!.market && top(m.prediction!.p) !== top(m.prediction!.market))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

/** Upcoming favourites whose opponent still wins at least one game in four. */
export function upsetRisks(matches: MatchView[], now: number, days = 7, n = 6) {
  return upcoming(matches, now, days)
    .map((m) => {
      const p = m.prediction!.p;
      const fav = p[0] >= p[2] ? 0 : 2;
      return { m, fav, fp: p[fav], dog: p[2 - fav] };
    })
    .filter((r) => r.fp >= 0.45 && r.dog >= 0.25)
    .sort((a, b) => b.dog - a.dog)
    .slice(0, n);
}
