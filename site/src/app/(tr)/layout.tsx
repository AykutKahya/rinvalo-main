import { Shell, shellMetadata, shellViewport } from "@/components/Shell";

export const metadata = shellMetadata("tr");
export const viewport = shellViewport;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Shell lang="tr">{children}</Shell>;
}
