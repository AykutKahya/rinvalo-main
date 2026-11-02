import { SharedPick, sharedPickMetadata } from "@/views/SharedPick";

export async function generateMetadata({ params }: PageProps<"/en/match/[id]/my-pick/[pick]">) {
  const { id, pick } = await params;
  return sharedPickMetadata(id, pick, "en");
}

export default async function Page({ params }: PageProps<"/en/match/[id]/my-pick/[pick]">) {
  const { id, pick } = await params;
  return <SharedPick id={id} pick={pick} lang="en" />;
}
