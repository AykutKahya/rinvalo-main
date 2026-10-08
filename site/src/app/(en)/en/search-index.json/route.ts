import { searchIndex } from "@/lib/search";

// Built once per deploy and fetched only when someone opens the search box.
export const dynamic = "force-static";

export function GET() {
  return Response.json(searchIndex("en"));
}
