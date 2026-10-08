import { compareData } from "@/lib/compare";

// Built once per deploy; the comparison page loads it in the browser.
export const dynamic = "force-static";

export function GET() {
  return Response.json(compareData());
}
