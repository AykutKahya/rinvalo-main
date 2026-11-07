import { getPredictions, getSeason } from "@/lib/data";
import { LEAGUES } from "@/lib/leagues";
import type { Prediction } from "@/lib/types";

// What a league page's "what if" tab simulates, built with the site: the season's games in the
// order the published simulation reads them, and the predictions of the games still to play.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return LEAGUES.map((l) => ({ code: l.code }));
}

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const fixtures = getSeason().fixtures.filter((f) => f.league === code);
  const all = getPredictions();
  const predictions: Record<string, Pick<Prediction, "p" | "lh" | "la" | "grid">> = {};
  for (const f of fixtures) {
    const p = all[f.id];
    if (f.status !== "finished" && p) predictions[f.id] = { p: p.p, lh: p.lh, la: p.la, grid: p.grid };
  }
  return Response.json({ fixtures, predictions });
}
