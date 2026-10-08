import { League, leagueMetadata, leagueParams } from "@/views/League";

export const generateStaticParams = leagueParams;
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/en/league/[code]">) {
  return leagueMetadata((await params).code, "en");
}

export default async function Page({ params }: PageProps<"/en/league/[code]">) {
  return <League code={(await params).code} lang="en" />;
}
