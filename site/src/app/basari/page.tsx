import type { Metadata } from "next";
import Link from "next/link";
import { CountUp } from "@/components/CountUp";
import { LeagueMark } from "@/components/Crest";
import { MatchRow } from "@/components/MatchRow";
import { accuracy, getEngineBacktest, getMarket, getMatches, LEAGUES } from "@/lib/data";
import { pct } from "@/lib/format";
import { outcomeOf } from "@/lib/model";

export const metadata: Metadata = { title: "Tahmin başarısı", description: "Rinvalo tahminlerinin isabet oranları." };

const CONF = { high: "Yüksek güven", medium: "Orta güven", low: "Düşük güven" } as const;
const ROWS: [string, string][] = [
  ["Rinvalo modeli", "Rinvalo"],
  ["Piyasa (maç öncesi oranlar)", "Bahis piyasası"],
];

export default function AccuracyPage() {
  const all = getMatches();
  const graded = all.filter((m) => m.hit !== null).sort((a, b) => b.kickoff.localeCompare(a.kickoff));
  const record = accuracy(all);
  const eb = getEngineBacktest();
  const market = getMarket();

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
          <h1>Tahmin başarısı</h1>
          <p>Tahminler maç başlamadan kilitlenir.</p>
        </div>
      </div>

      <div className="stat-row">
        <div className="card stat">
          <b>{record.n}</b>
          <span>Sonuçlanan tahmin</span>
        </div>
        <div className="card stat">
          <b style={{ color: "var(--good)" }}>{record.n ? pct(record.hits / record.n) : "–"}</b>
          <span>Bu sezon isabet</span>
        </div>
        <div className="card stat">
          <b>{eb ? <CountUp value={eb.byConfidence.high.accuracy} /> : "–"}</b>
          <span>Yüksek güven isabeti</span>
        </div>
        <div className="card stat">
          <b>{eb ? <CountUp value={eb.overall["Rinvalo modeli"].accuracy} /> : "–"}</b>
          <span>Son 3 sezon isabet</span>
        </div>
      </div>

      <div className="match-grid">
        <div className="stack">
          {eb && (
            <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="section-title" style={{ margin: 0 }}>
                <h2>Son 3 sezon</h2>
                <span className="muted" style={{ fontSize: 13 }}>
                  {eb.seasons[0]} – {eb.seasons[eb.seasons.length - 1]} · {eb.overall["Rinvalo modeli"].matches.toLocaleString("tr-TR")} maç
                </span>
              </div>
              <div className="table-wrap">
                <table className="std">
                  <thead>
                    <tr>
                      <th>Yöntem</th>
                      <th className="c">İsabet</th>
                      <th className="c">Log loss</th>
                      <th className="c">Brier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map(([key, label]) => {
                      const r = eb.overall[key];
                      return r ? (
                        <tr key={key} className={key === "Rinvalo modeli" ? "hl" : undefined}>
                          <td>
                            <b>{label}</b>
                          </td>
                          <td className="c num">{pct(r.accuracy, 1)}</td>
                          <td className="c num">{r.logloss.toFixed(4).replace(".", ",")}</td>
                          <td className="c num">{r.brier.toFixed(4).replace(".", ",")}</td>
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
              <span>Sonuçlanan tahminler</span>
              <span>Tahmin · Skor</span>
            </div>
            {graded.length ? (
              graded.slice(0, 60).map((m) => <MatchRow key={m.id} m={m} showDate />)
            ) : (
              <div className="empty">Henüz sonuçlanan tahmin yok.</div>
            )}
          </section>
        </div>

        <aside className="stack">
          {eb && (
            <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h2 style={{ fontSize: 18 }}>Güven seviyesine göre</h2>
              <div className="mini-list">
                {(["high", "medium", "low"] as const).map((k) => (
                  <div key={k} className="mini-item">
                    <span className={`conf conf-${k}`}>
                      <i aria-hidden="true" />
                      {CONF[k]}
                    </span>
                    <span>
                      <b className="num" style={{ fontSize: 18 }}>
                        {pct(eb.byConfidence[k].accuracy)}
                      </b>{" "}
                      <span className="muted" style={{ fontSize: 12 }}>
                        {eb.byConfidence[k].matches.toLocaleString("tr-TR")} maç
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {eb && (
            <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h2 style={{ fontSize: 18 }}>Kalibrasyon</h2>
              <div className="calib-row muted" style={{ fontSize: 12 }}>
                <span>Tahmin</span>
                <span />
                <span>Gerçek</span>
              </div>
              <div className="calib">
                {eb.calibration.map((c) => (
                  <div key={c.bin} className="calib-row">
                    <span className="num">{pct(c.predicted)}</span>
                    <span className="calib-track">
                      <i style={{ width: `${c.observed * 100}%` }} />
                      <em style={{ left: `${c.predicted * 100}%` }} />
                    </span>
                    <span className="num">{pct(c.observed)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="card card-pad">
            <div className="section-title">
              <h2 style={{ fontSize: 18 }}>Lig lig</h2>
            </div>
            <div className="table-wrap">
              <table className="std">
                <thead>
                  <tr>
                    <th>Lig</th>
                    <th className="c">Bu sezon</th>
                    <th className="c">Test</th>
                    <th className="c">Piyasa</th>
                  </tr>
                </thead>
                <tbody>
                  {LEAGUES.map((l) => {
                    const r = accuracy(all.filter((m) => m.league === l.code));
                    const b = eb?.perLeague[l.code];
                    return (
                      <tr key={l.code}>
                        <td>
                          <Link href={`/lig/${l.code}`} className="tname">
                            <LeagueMark code={l.code} accent={l.accent} />
                            {l.name}
                          </Link>
                        </td>
                        <td className="c">{r.n ? `${pct(r.hits / r.n)} (${r.n})` : "–"}</td>
                        <td className="c">{b ? pct(b.rinvalo.accuracy) : "–"}</td>
                        <td className="c muted">{b ? pct(b.market.accuracy) : "–"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {vs.length > 0 && (
            <section className="card card-pad">
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>Bu sezon: Rinvalo – piyasa</h2>
              <div className="kv-grid">
                <div className="kv">
                  <small>Rinvalo</small>
                  <b>{pct(vs.filter((v) => v.rinvalo).length / vs.length)}</b>
                </div>
                <div className="kv">
                  <small>Piyasa</small>
                  <b>{pct(vs.filter((v) => v.market).length / vs.length)}</b>
                </div>
              </div>
              <p className="muted" style={{ margin: "8px 0 0", fontSize: 12 }}>
                {vs.length} maç
              </p>
            </section>
          )}

        </aside>
      </div>
    </>
  );
}
