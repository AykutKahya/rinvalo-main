import { Match, matchMetadata, matchParams } from "@/views/Match";

export const generateStaticParams = matchParams;
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/mac/[id]">) {
  return matchMetadata((await params).id, "tr");
}

export default async function Page({ params }: PageProps<"/mac/[id]">) {
  return <Match id={(await params).id} lang="tr" />;
}
