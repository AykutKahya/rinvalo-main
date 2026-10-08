import { Leagues, leaguesMetadata } from "@/views/Leagues";

export const metadata = leaguesMetadata("tr");

export default function Page() {
  return <Leagues lang="tr" />;
}
