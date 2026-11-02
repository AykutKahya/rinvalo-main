import type { Metadata } from "next";
import { alternates, dict, type Lang } from "@/lib/i18n";

/** Shown only when an address is configured (NEXT_PUBLIC_CONTACT_EMAIL in Vercel). */
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export function privacyMetadata(lang: Lang): Metadata {
  const t = dict(lang).privacy;
  return { title: t.title, description: t.description, alternates: alternates(lang, "privacy") };
}

export function Privacy({ lang }: { lang: Lang }) {
  const t = dict(lang).privacy;
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t.title}</h1>
          <p>{t.updated}</p>
        </div>
      </div>
      <article className="card card-pad prose">
        {t.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {s.p.map((x) => (
              <p key={x.slice(0, 24)}>{x}</p>
            ))}
          </section>
        ))}
        {CONTACT && (
          <p className="muted">
            {t.contact(CONTACT)}
          </p>
        )}
      </article>
    </>
  );
}
