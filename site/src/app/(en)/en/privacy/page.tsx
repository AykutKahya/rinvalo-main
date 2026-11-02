import { Privacy, privacyMetadata } from "@/views/Privacy";

export const metadata = privacyMetadata("en");

export default function Page() {
  return <Privacy lang="en" />;
}
