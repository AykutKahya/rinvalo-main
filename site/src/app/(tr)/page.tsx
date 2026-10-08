import { alternates } from "@/lib/i18n";
import { Home } from "@/views/Home";

export const metadata = { alternates: alternates("tr", "home") };

export default function Page() {
  return <Home lang="tr" />;
}
