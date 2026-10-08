import { Accuracy, accuracyMetadata } from "@/views/Accuracy";

export const metadata = accuracyMetadata("en");

export default function Page() {
  return <Accuracy lang="en" />;
}
