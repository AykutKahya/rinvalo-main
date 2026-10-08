import { Headlines, headlinesMetadata } from "@/views/Headlines";

export const metadata = headlinesMetadata("tr");

export default function Page() {
  return <Headlines lang="tr" />;
}
