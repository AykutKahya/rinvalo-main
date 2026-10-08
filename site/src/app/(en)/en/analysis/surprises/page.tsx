import { Surprises, surprisesMetadata } from "@/views/Surprises";

export const metadata = surprisesMetadata("en");

export default function Page() {
  return <Surprises lang="en" />;
}
