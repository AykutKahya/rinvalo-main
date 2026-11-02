import { Week, weekMetadata, weekParams } from "@/views/Week";

export const generateStaticParams = weekParams;
// Rounds away from today are rendered on first visit and kept until the next deploy.
export const dynamicParams = true;

export async function generateMetadata({ params }: PageProps<"/en/league/[code]/round/[round]">) {
  const { code, round } = await params;
  return weekMetadata(code, round, "en");
}

export default async function Page({ params }: PageProps<"/en/league/[code]/round/[round]">) {
  const { code, round } = await params;
  return <Week code={code} round={round} lang="en" />;
}
