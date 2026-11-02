import { Match, matchMetadata, matchParams } from "@/views/Match";

export const generateStaticParams = matchParams;
// Pages outside the build window are rendered on first visit and kept until the next deploy.
export const dynamicParams = true;

export async function generateMetadata({ params }: PageProps<"/en/match/[id]">) {
  return matchMetadata((await params).id, "en");
}

export default async function Page({ params }: PageProps<"/en/match/[id]">) {
  return <Match id={(await params).id} lang="en" />;
}
