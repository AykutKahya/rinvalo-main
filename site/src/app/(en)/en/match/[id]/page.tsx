import { Match, matchMetadata } from "@/views/Match";

// English pages are rendered on first visit and kept until the next deploy (fewer ISR writes per deploy).
export const generateStaticParams = () => [] as { id: string }[];
export const dynamicParams = true;

export async function generateMetadata({ params }: PageProps<"/en/match/[id]">) {
  return matchMetadata((await params).id, "en");
}

export default async function Page({ params }: PageProps<"/en/match/[id]">) {
  return <Match id={(await params).id} lang="en" />;
}
