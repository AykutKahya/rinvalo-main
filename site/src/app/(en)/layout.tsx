import { Shell, shellMetadata, shellViewport } from "@/components/Shell";

export const metadata = shellMetadata("en");
export const viewport = shellViewport;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Shell lang="en">{children}</Shell>;
}
