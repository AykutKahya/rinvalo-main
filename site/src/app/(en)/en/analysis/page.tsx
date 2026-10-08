import { Analysis, analysisMetadata } from "@/views/Analysis";

export const metadata = analysisMetadata("en");

export default function Page() {
  return <Analysis lang="en" />;
}
