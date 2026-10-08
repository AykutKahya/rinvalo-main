import { fetchLive } from "@/lib/liveFeed";

// Scores of games in play, fetched on request and cached at the edge for a minute. The site
// itself is not rebuilt for a goal.
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await fetchLive(), {
    headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=60" },
  });
}
