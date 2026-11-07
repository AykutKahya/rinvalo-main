import { National, nationalMetadata } from "@/views/National";

export const metadata = nationalMetadata("en");

export default function Page() {
  return <National lang="en" />;
}
