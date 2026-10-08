import { League, leagueMetadata, leagueParams } from "@/views/League";

export const generateStaticParams = leagueParams;
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/lig/[code]">) {
  return leagueMetadata((await params).code, "tr");
}

export default async function Page({ params }: PageProps<"/lig/[code]">) {
  return <League code={(await params).code} lang="tr" />;
}
