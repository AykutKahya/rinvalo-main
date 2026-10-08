import type { Metadata } from "next";
import { Shell } from "@/components/Shell";
import { NotFound } from "@/views/NotFound";

export const metadata: Metadata = { title: "404 · Rinvalo" };

// Unmatched URLs have no route group, so they get the Turkish frame.
export default function GlobalNotFound() {
  return (
    <Shell lang="tr">
      <NotFound lang="tr" />
    </Shell>
  );
}
