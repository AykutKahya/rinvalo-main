import { Team, teamMetadata, teamParams } from "@/views/Team";

export const generateStaticParams = teamParams;
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/en/team/[slug]">) {
  return teamMetadata((await params).slug, "en");
}

export default async function Page({ params }: PageProps<"/en/team/[slug]">) {
  return <Team slug={(await params).slug} lang="en" />;
}
