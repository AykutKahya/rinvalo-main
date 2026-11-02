import type { Metadata } from "next";
import Link from "next/link";
import { CountUp } from "@/components/CountUp";
import { LeagueMark } from "@/components/Crest";
import { MatchRow } from "@/components/MatchRow";
import { Paged } from "@/components/Pager";
import { accuracy, getEngineBacktest, getMarket, getMatches, getTracking, LEAGUES } from "@/lib/data";
import { fmt } from "@/lib/format";
import { alternates, dict, paths, type Lang } from "@/lib/i18n";
import { outcomeOf } from "@/lib/model";

export function accuracyMetadata(lang: Lang): Metadata {
  const t = dict(lang).accuracy;
  return { title: t.title, description: t.description, alternates: alternates(lang, "accuracy") };
}

/** Keys of engine-backtest.json "overall". */
const MODEL = "Rinvalo modeli";
const MARKET = "Piyasa (maç öncesi oranlar)";

export function Accuracy({ lang }: { lang: Lang }) {
  const d = dict(lang);
  const t = d.accuracy;
  const f = fmt(lang);
  const p = paths(lang);
  const all = getMatches();
  const graded = all.filter((m) => m.hit !== null).sort((a, b) => b.kickoff.localeCompare(a.kickoff));
  const record = accuracy(all);
  const eb = getEngineBacktest();
  const tracking = getTracking();
  const market = getMarket();
  const rows: [string, string][] = [
    [MODEL, t.rinvalo],
    [MARKET, t.market],
  ];

  // This season: Rinvalo's frozen pick vs the pre-match market on the same games.
  const vs = graded
    .filter((m) => market[m.id])
    .map((m) => {
      const mk = market[m.id];
      const o = outcomeOf(m.hg!, m.ag!);
      return { rinvalo: m.hit!, market: mk.indexOf(Math.max(...mk)) === o };
    });

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">{d.analysis.eyebrow}</span>
          <h1>{t.title}</h1>
          <p>{t.sub}</p>
        </div>
      </div>

      <div className="stat-row">
        <div className="card stat">
          <b>{record.n}</b>
          <span>{t.graded}</span>
        </div>
        <div className="card stat">
          <b style={{ color: "var(--good)" }}>{record.n ? f.pct(record.hits / record.n) : "–"}</b>
          <span>{t.seasonHits}</span>
        </div>
        <div className="card stat">
          <b>{eb ? <CountUp value={eb.byConfidence.high.accuracy} lang={lang} /> : "–"}</b>
          <span>{t.highHits}</span>
        </div>
        <div className="card stat">
          <b>{eb ? <CountUp value={eb.overall[MODEL].accuracy} lang={lang} /> : "–"}</b>
          <span>{t.last3Hits}</span>
        </div>
      </div>

      <div className="match-grid">
        <div className="stack">
          {eb && (
            <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="section-title" style={{ margin: 0 }}>
                <h2>{t.last3}</h2>
                <span className="muted" style={{ fontSize: 13 }}>
                  {eb.seasons[0]} – {eb.seasons[eb.seasons.length - 1]} · {t.games(f.int(eb.overall[MODEL].matches))}
                </span>
              </div>
              <div className="table-wrap">
                <table className="std">
                  <thead>
                    <tr>
                      <th>{t.method}</th>
                      <th className="c">{t.hits}</th>
                      <th className="c">Log loss</th>
                      <th className="c">Brier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(([key, label]) => {
                      const r = eb.overall[key];
                      return r ? (
                        <tr key={key} className={key === MODEL ? "hl" : undefined}>
                          <td>
                            <b>{label}</b>
                          </td>
                          <td className="c num">{f.pct(r.accuracy, 1)}</td>
                          <td className="c num">{f.dec(r.logloss, 4)}</td>
                          <td className="c num">{f.dec(r.brier, 4)}</td>
                        </tr>
                      ) : null;
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="card group" style={{ margin: 0 }}>
            <div className="group-head">
              <span>{t.gradedList}</span>
              <span>{t.pickScore}</span>
            </div>
            <Paged items={graded.map((m) => <MatchRow key={m.id} m={m} showDate lang={lang} />)} per={15} lang={lang} empty={<div className="empty">{t.noneYet}</div>} />
          </section>
        </div>

        <aside className="stack">
          {eb && (
            <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h2 style={{ fontSize: 18 }}>{t.byConf}</h2>
              <div className="mini-list">
                {(["high", "medium", "low"] as const).map((k) => (
                  <div key={k} className="mini-item">
                    <span className={`conf conf-${k}`}>
                      <i aria-hidden="true" />
                      {d.conf[k]}
                    </span>
                    <span>
                      <b className="num" style={{ fontSize: 18 }}>
                        {f.pct(eb.byConfidence[k].accuracy)}
                      </b>{" "}
                      <span className="muted" style={{ fontSize: 12 }}>
                        {t.games(f.int(eb.byConfidence[k].matches))}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {eb && (
            <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h2 style={{ fontSize: 18 }}>{t.calibration}</h2>
              <div className="calib-row muted" style={{ fontSize: 12 }}>
                <span>{t.predicted}</span>
                <span />
                <span>{t.observed}</span>
              </div>
              <div className="calib">
                {eb.calibration.map((c) => (
                  <div key={c.bin} className="calib-row">
                    <span className="num">{f.pct(c.predicted)}</span>
                    <span className="calib-track">
                      <i style={{ width: `${c.observed * 100}%` }} />
                      <em style={{ left: `${c.predicted * 100}%` }} />
                    </span>
                    <span className="num">{f.pct(c.observed)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="card card-pad">
            <div className="section-title">
              <h2 style={{ fontSize: 18 }}>{t.perLeague}</h2>
            </div>
            <div className="table-wrap">
              <table className="std">
                <thead>
                  <tr>
                    <th>{t.league}</th>
                    <th className="c">{t.thisSeason}</th>
                    <th className="c">{t.test}</th>
                    <th className="c">{t.marketShort}</th>
                  </tr>
                </thead>
                <tbody>
                  {LEAGUES.map((l) => {
                    const r = accuracy(all.filter((m) => m.league === l.code));
                    const b = eb?.perLeague[l.code];
                    const tr = tracking.leagues[l.code];
                    return (
                      <tr key={l.code}>
                        <td>
                          <Link href={p.leagueOf(l.code)} className="tname">
                            <LeagueMark code={l.code} accent={l.accent} />
                            {l.name}
                          </Link>
                        </td>
                        <td className="c">
                          {r.n ? `${f.pct(r.hits / r.n)} (${r.n})` : "–"}
                          {tr && (
                            <span
                              className={`track-dot ${tr.status}`}
                              role="img"
                              aria-label={t.statusLabel[tr.status]}
                              title={`${t.statusLabel[tr.status]} · ${t.lossTitle(f.dec(tr.logloss), tr.test ? f.dec(tr.test) : "–")}`}
                            />
                          )}
                        </td>
                        <td className="c">{b ? f.pct(b.rinvalo.accuracy) : "–"}</td>
                        <td className="c muted">{b ? f.pct(b.market.accuracy) : "–"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ margin: "8px 0 0", fontSize: 12 }}>
              {t.statusNote}
            </p>
          </section>

          {vs.length > 0 && (
            <section className="card card-pad">
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>{t.vs}</h2>
              <div className="kv-grid">
                <div className="kv">
                  <small>Rinvalo</small>
                  <b>{f.pct(vs.filter((v) => v.rinvalo).length / vs.length)}</b>
                </div>
                <div className="kv">
                  <small>{t.marketShort}</small>
                  <b>{f.pct(vs.filter((v) => v.market).length / vs.length)}</b>
                </div>
              </div>
              <p className="muted" style={{ margin: "8px 0 0", fontSize: 12 }}>
                {t.games(String(vs.length))}
              </p>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
