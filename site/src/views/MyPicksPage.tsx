import type { Metadata } from "next";
import { LeagueHub } from "@/components/LeagueHub";
import { alternates, dict, type Lang } from "@/lib/i18n";

export function myPicksMetadata(lang: Lang): Metadata {
  const t = dict(lang).league2;
  return { title: t.title, description: t.description, alternates: alternates(lang, "myPicks") };
}

export function MyPicksPage({ lang }: { lang: Lang }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{dict(lang).league2.title}</h1>
          <p>{dict(lang).league2.rule}</p>
        </div>
      </div>
      <LeagueHub lang={lang} />
    </>
  );
}
