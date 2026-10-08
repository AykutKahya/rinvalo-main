import { Compare, compareMetadata } from "@/views/Compare";

export const metadata = compareMetadata("en");

export default function Page() {
  return <Compare lang="en" />;
}
