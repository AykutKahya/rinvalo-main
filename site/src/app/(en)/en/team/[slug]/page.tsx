import { Team, teamMetadata, teamParams } from "@/views/Team";

export const generateStaticParams = teamParams;
// Pages outside the build window are rendered on first visit and kept until the next deploy.
export const dynamicParams = true;

export async function generateMetadata({ params }: PageProps<"/en/team/[slug]">) {
  return teamMetadata((await params).slug, "en");
}

export default async function Page({ params }: PageProps<"/en/team/[slug]">) {
  return <Team slug={(await params).slug} lang="en" />;
}
