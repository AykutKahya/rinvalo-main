import { SharedPick, sharedPickMetadata } from "@/views/SharedPick";

export async function generateMetadata({ params }: PageProps<"/mac/[id]/tahminim/[pick]">) {
  const { id, pick } = await params;
  return sharedPickMetadata(id, pick, "tr");
}

export default async function Page({ params }: PageProps<"/mac/[id]/tahminim/[pick]">) {
  const { id, pick } = await params;
  return <SharedPick id={id} pick={pick} lang="tr" />;
}
