import { getMatches } from "@/lib/data";
import { team } from "@/lib/teams";

// Results and Rinvalo picks for every fixture, loaded only by the "my picks" page.
export const dynamic = "force-static";

export function GET() {
  const names: Record<string, [string, string]> = {};
  const fixtures: Record<string, [string, string, string, number | null, number | null, number | null, number | null]> = {};
  for (const m of getMatches()) {
    for (const s of [m.home, m.away]) names[s] ??= [team(s).name, team(s, "en").name];
    fixtures[m.id] = [m.kickoff, m.home, m.away, m.hg, m.ag, m.prediction?.score[0] ?? null, m.prediction?.score[1] ?? null];
  }
  return Response.json({ names, fixtures });
}
