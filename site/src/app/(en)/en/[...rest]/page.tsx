import { notFound } from "next/navigation";

// Unknown /en/... addresses get the English 404 instead of the global Turkish one.
export default function Page() {
  notFound();
}
