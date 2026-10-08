import { MyPicksPage, myPicksMetadata } from "@/views/MyPicksPage";

export const metadata = myPicksMetadata("en");

export default function Page() {
  return <MyPicksPage lang="en" />;
}
