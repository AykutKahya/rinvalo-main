import { Headlines, headlinesMetadata } from "@/views/Headlines";

export const metadata = headlinesMetadata("en");

export default function Page() {
  return <Headlines lang="en" />;
}
