import { National, nationalMetadata } from "@/views/National";

export const metadata = nationalMetadata("tr");

export default function Page() {
  return <National lang="tr" />;
}
