import { Match, matchMetadata, matchParams } from "@/views/Match";

export const generateStaticParams = matchParams;
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/en/match/[id]">) {
  return matchMetadata((await params).id, "en");
}

export default async function Page({ params }: PageProps<"/en/match/[id]">) {
  return <Match id={(await params).id} lang="en" />;
}
