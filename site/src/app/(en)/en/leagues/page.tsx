import { Leagues, leaguesMetadata } from "@/views/Leagues";

export const metadata = leaguesMetadata("en");

export default function Page() {
  return <Leagues lang="en" />;
}
