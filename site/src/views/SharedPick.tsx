import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Redirect } from "@/components/Redirect";
import { getMatch } from "@/lib/data";
import { dict, paths, type Lang } from "@/lib/i18n";
import { team } from "@/lib/teams";

const PICK = /^(\d)-(\d)$/;

/**
 * The link a visitor shares after making a pick. Link previews read this page's tags and show
 * the visitor's score on the share image; people who open it go straight on to the match page.
 */
export function sharedPickMetadata(id: string, pick: string, lang: Lang): Metadata {
  const m = getMatch(id);
  if (!m || !PICK.test(pick)) return {};
  const title = dict(lang).sharePick.pickTitle(team(m.home, lang).name, pick, team(m.away, lang).name);
  const image = `/og/${lang}/${id}?t=${pick}`;
  return {
    title,
    description: dict(lang).sharePick.pickText,
    robots: { index: false },
    openGraph: { title, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [image] },
  };
}

export function SharedPick({ id, pick, lang }: { id: string; pick: string; lang: Lang }) {
  if (!getMatch(id) || !PICK.test(pick)) notFound();
  const to = paths(lang).matchOf(id);
  return (
    <div className="card empty">
      <Redirect to={to} />
      <Link href={to}>{dict(lang).sharePick.open}</Link>
    </div>
  );
}
