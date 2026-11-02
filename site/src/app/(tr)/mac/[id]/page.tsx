import { Match, matchMetadata, matchParams } from "@/views/Match";

export const generateStaticParams = matchParams;
// Pages outside the build window are rendered on first visit and kept until the next deploy.
export const dynamicParams = true;

export async function generateMetadata({ params }: PageProps<"/mac/[id]">) {
  return matchMetadata((await params).id, "tr");
}

export default async function Page({ params }: PageProps<"/mac/[id]">) {
  return <Match id={(await params).id} lang="tr" />;
}
