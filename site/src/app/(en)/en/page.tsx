import { alternates } from "@/lib/i18n";
import { Home } from "@/views/Home";

export const metadata = { alternates: alternates("en", "home") };

export default function Page() {
  return <Home lang="en" />;
}
