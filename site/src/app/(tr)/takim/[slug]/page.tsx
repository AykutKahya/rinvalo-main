import { Team, teamMetadata, teamParams } from "@/views/Team";

export const generateStaticParams = teamParams;
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/takim/[slug]">) {
  return teamMetadata((await params).slug, "tr");
}

export default async function Page({ params }: PageProps<"/takim/[slug]">) {
  return <Team slug={(await params).slug} lang="tr" />;
}
