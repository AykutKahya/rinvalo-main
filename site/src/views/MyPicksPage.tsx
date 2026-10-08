import type { Metadata } from "next";
import { MyPicks } from "@/components/MyPicks";
import { alternates, dict, type Lang } from "@/lib/i18n";

export function myPicksMetadata(lang: Lang): Metadata {
  const t = dict(lang).myPicks;
  return { title: t.title, description: t.description, alternates: alternates(lang, "myPicks"), robots: { index: false } };
}

export function MyPicksPage({ lang }: { lang: Lang }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{dict(lang).myPicks.title}</h1>
        </div>
      </div>
      <MyPicks lang={lang} />
    </>
  );
}
