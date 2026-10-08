import type { Metadata } from "next";
import { SurpriseRow } from "@/components/SurpriseRow";
import { getMatches, type MatchView } from "@/lib/data";
import { fmt } from "@/lib/format";
import { alternates, dict, type Lang } from "@/lib/i18n";
import { disagreements, shocks, upsetRisks } from "@/lib/picks";
import { team } from "@/lib/teams";

export function surprisesMetadata(lang: Lang): Metadata {
  const t = dict(lang).surprises;
  return { title: t.title, description: t.description, alternates: alternates(lang, "surprises") };
}

const top = (p: number[]) => p.indexOf(Math.max(...p));

export function Surprises({ lang }: { lang: Lang }) {
  const d = dict(lang);
  const t = d.surprises;
  const { pct } = fmt(lang);
  const now = Date.now();
  const all = getMatches();
  const shock = shocks(all, now);
  const diff = disagreements(all, now);
  const risk = upsetRisks(all, now);
  const side = (m: MatchView, i: number) => (i === 0 ? team(m.home).short : i === 2 ? team(m.away).short : d.drawShort);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">{d.analysis.eyebrow}</span>
          <h1>{t.title}</h1>
        </div>
      </div>

      <div className="surprise-grid">
        <section className="card group" style={{ margin: 0 }}>
          <div className="group-head">
            <span>{t.shocks}</span>
            <span>{t.chance}</span>
          </div>
          {shock.length ? (
            shock.map(({ m, chance }) => <SurpriseRow key={m.id} m={m} lang={lang} figure={pct(chance)} note={t.given} tone="bad" />)
          ) : (
            <div className="empty">{t.noShocks}</div>
          )}
        </section>

        <div className="stack">
          {diff.length > 0 && (
            <section className="card group" style={{ margin: 0 }}>
              <div className="group-head">
                <span>{t.diff}</span>
                <span>Rinvalo</span>
              </div>
              {diff.map((m) => {
                const p = m.prediction!;
                const r = top(p.p);
                const k = top(p.market!);
                return <SurpriseRow key={m.id} m={m} lang={lang} figure={`${side(m, r)} ${pct(p.p[r])}`} note={t.market(`${side(m, k)} ${pct(p.market![k])}`)} tone="plain" />;
              })}
            </section>
          )}

          {risk.length > 0 && (
            <section className="card group" style={{ margin: 0 }}>
              <div className="group-head">
                <span>{t.risky}</span>
                <span>{t.upsetChance}</span>
              </div>
              {risk.map(({ m, fav, fp, dog }) => (
                <SurpriseRow key={m.id} m={m} lang={lang} figure={pct(dog)} note={t.favourite(`${side(m, fav)} ${pct(fp)}`)} tone="warn" />
              ))}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
