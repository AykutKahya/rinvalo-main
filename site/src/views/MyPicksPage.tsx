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
        </div>
      </div>
      <section className="card card-pad how">
        <h2>{dict(lang).league2.howTitle}</h2>
        <ol className="how-grid steps">
          {dict(lang).league2.how.map(([q, a]) => (
            <li key={q}>
              <h3>{q}</h3>
              <p>{a}</p>
            </li>
          ))}
        </ol>
      </section>
      <LeagueHub lang={lang} />
    </>
  );
}
