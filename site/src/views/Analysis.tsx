import type { Metadata } from "next";
import Link from "next/link";
import { ConfidencePill } from "@/components/Confidence";
import { CountUp } from "@/components/CountUp";
import { Crest, LeagueMark } from "@/components/Crest";
import { accuracy, getEngineBacktest, getMatches, getRatings, LEAGUES } from "@/lib/data";
import { fmt } from "@/lib/format";
import { alternates, dict, paths, type Lang } from "@/lib/i18n";
import { disagreements, shocks, upsetRisks } from "@/lib/picks";
import { team } from "@/lib/teams";

export function analysisMetadata(lang: Lang): Metadata {
  const t = dict(lang).analysis;
  return { title: t.title, description: t.description, alternates: alternates(lang, "analysis") };
}

export function Analysis({ lang }: { lang: Lang }) {
  const t = dict(lang).analysis;
  const f = fmt(lang);
  const p = paths(lang);
  const now = Date.now();
  const all = getMatches();
  const { leagues } = getRatings();
  const shock = shocks(all, now, 1)[0];
  const nDiff = disagreements(all, now).length;
  const risks = upsetRisks(all, now, 7, 3);
  const eb = getEngineBacktest();
  const record = accuracy(all);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t.title}</h1>
        </div>
      </div>

      <div className="hub-grid">
        <Link href={p.power} className="card card-pad hub-card reveal">
          <span className="eyebrow">{t.power}</span>
          <h2>{t.peaks}</h2>
          <div className="mini-list">
            {LEAGUES.filter((l) => leagues[l.code]?.length).map((l) => {
              const r = leagues[l.code][0];
              return (
                <div key={l.code} className="mini-item">
                  <span className="tname">
                    <LeagueMark code={l.code} accent={l.accent} />
                    <Crest slug={r.team} size="sm" />
                    {team(r.team, lang).name}
                  </span>
                  <b className="num">{Math.round(r.elo)}</b>
                </div>
              );
            })}
          </div>
          <span className="hub-more">{t.allRanking}</span>
        </Link>

        <Link href={p.surprises} className="card card-pad hub-card reveal">
          <span className="eyebrow">{t.surprises}</span>
          <h2>{shock ? `${team(shock.m.home, lang).name} ${shock.m.hg}-${shock.m.ag} ${team(shock.m.away, lang).name}` : t.favsAtRisk}</h2>
          <div className="mini-list">
            {risks.map(({ m, dog }) => (
              <div key={m.id} className="mini-item">
                <span className="tname">
                  <Crest slug={m.home} size="sm" />
                  <Crest slug={m.away} size="sm" />
                  {team(m.home).short} – {team(m.away).short}
                </span>
                <span className="muted" style={{ fontSize: 12.5 }}>
                  {t.upset} <b className="num tone-warn">{f.pct(dog)}</b>
                </span>
              </div>
            ))}
          </div>
          {nDiff > 0 && <p className="muted">{t.diffCount(nDiff)}</p>}
          <span className="hub-more">{t.seeAll}</span>
        </Link>

        <Link href={p.accuracy} className="card card-pad hub-card reveal">
          <span className="eyebrow">{t.accuracy}</span>
          <h2>{t.last3}</h2>
          <div className="kv-grid">
            <div className="kv">
              <small>{t.overall}</small>
              <b>{eb ? <CountUp value={eb.overall["Rinvalo modeli"].accuracy} lang={lang} /> : "–"}</b>
            </div>
            <div className="kv">
              <small>{t.tested}</small>
              <b>{eb ? f.int(eb.overall["Rinvalo modeli"].matches) : "–"}</b>
            </div>
          </div>
          {eb && (
            <div className="mini-list">
              {(["high", "medium", "low"] as const).map((k) => (
                <div key={k} className="mini-item">
                  <ConfidencePill level={k} lang={lang} />
                  <b className="num">{f.pct(eb.byConfidence[k].accuracy)}</b>
                </div>
              ))}
            </div>
          )}
          {record.n > 0 && <p className="muted">{t.season(record.n, f.pct(record.hits / record.n))}</p>}
          <span className="hub-more">{t.details}</span>
        </Link>
      </div>
    </>
  );
}
