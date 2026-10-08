import type { Metadata } from "next";
import Link from "next/link";
import { CountUp } from "@/components/CountUp";
import { LeagueMark } from "@/components/Crest";
import { MatchRow } from "@/components/MatchRow";
import { accuracy, getEngineBacktest, getMarket, getMatches, LEAGUES } from "@/lib/data";
import { pct } from "@/lib/format";
import { outcomeOf } from "@/lib/model";

export const metadata: Metadata = { title: "Tahmin başarısı", description: "Rinvalo tahminlerinin bu sezonki ve geçmiş sezon testindeki isabeti, piyasayla karşılaştırması." };

const CONF = { high: "Yüksek güven", medium: "Orta güven", low: "Düşük güven" } as const;
const ROW_NOTE: Record<string, string> = {
  "Eski model (yalnız skorlar)": "Sitenin ilk sürümü",
  "Rinvalo modeli": "Şu an yayındaki motor",
  "Piyasa (maç öncesi oranlar)": "Kıyas: bahis şirketleri",
  "Piyasa (kapanış oranları)": "Kıyas: maç başlarken",
};

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
          <h1>Tahminlerimiz ne kadar tutuyor?</h1>
          <p>Her tahmin maç başlamadan önce dondurulur, sonradan değiştirilmez. Burada hepsi açıkça sayılır.</p>
        </div>
      </div>

      <div className="stat-row">
        <div className="card stat">
          <b>{record.n}</b>
          <span>Bu sezon sonuçlanan tahmin</span>
        </div>
        <div className="card stat">
          <b style={{ color: "var(--good)" }}>{record.n ? pct(record.hits / record.n) : "–"}</b>
          <span>Bu sezon 1-X-2 isabeti</span>
        </div>
        <div className="card stat">
          <b>{eb ? <CountUp value={eb.byConfidence.high.accuracy} /> : "–"}</b>
          <span>Yüksek güvenli tahminlerde isabet (test)</span>
        </div>
        <div className="card stat">
          <b>{eb ? <CountUp value={eb.overall["Rinvalo modeli"].accuracy} /> : "–"}</b>
          <span>Son 3 sezon testinde isabet</span>
        </div>
      </div>

      <div className="match-grid">
        <div className="stack">
          {eb && (
            <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="section-title" style={{ margin: 0 }}>
                <h2>Son 3 sezonun testi</h2>
                <span className="muted" style={{ fontSize: 13 }}>
                  {eb.seasons[0]} – {eb.seasons[eb.seasons.length - 1]} · {eb.overall["Rinvalo modeli"].matches.toLocaleString("tr-TR")} maç
                </span>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                Her sezon, model yalnız o sezondan önceki maçlarla kuruldu ve her maç yalnız başlamadan önceki bilgilerle tahmin edildi. Log loss olasılıkların ne kadar isabetli olduğunu ölçer; düşük olan daha iyidir.
              </p>
              <div className="table-wrap">
                <table className="std">
                  <thead>
                    <tr>
                      <th>Yöntem</th>
                      <th className="c">1-X-2 isabeti</th>
                      <th className="c">Log loss</th>
                      <th className="c">Brier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(eb.overall).map(([name, s]) => (
                      <tr key={name} className={name === "Rinvalo modeli" ? "hl" : undefined}>
                        <td>
                          <b>{name}</b>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {ROW_NOTE[name]}
                          </div>
                        </td>
                        <td className="c num">{pct(s.accuracy, 1)}</td>
                        <td className="c num">{s.logloss.toFixed(4).replace(".", ",")}</td>
                        <td className="c num">{s.brier.toFixed(4).replace(".", ",")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-2)" }}>
                Bahis piyasası sakatlık, ilk 11 ve kadro haberlerini fiyatlar; Rinvalo yalnız skor, şut, xG ve form verisinden öğrenir. O yüzden piyasa birkaç puan önde. İkisinin farklı sonuç beklediği {eb.disagreement.matches} maçta piyasa {pct(eb.disagreement.marketRight)}, Rinvalo {pct(eb.disagreement.rinvaloRight)} haklı çıktı; bu maçlarda güven etiketi otomatik düşer.
              </p>
            </section>
          )}

          <section className="card group" style={{ margin: 0 }}>
            <div className="group-head">
              <span>Bu sezon sonuçlanan tahminler</span>
              <span>Tahmin · Skor</span>
            </div>
            {graded.length ? (
              graded.slice(0, 60).map((m) => <MatchRow key={m.id} m={m} showDate />)
            ) : (
              <div className="empty">
                <b>İlk sonuçlar bu hafta sonu geliyor</b>
                Rinvalo bu sezon yalnız maç oynanmadan önce yaptığı tahminleri sayar. Maçlar oynandıkça liste burada dolacak.
              </div>
            )}
          </section>
        </div>

        <aside className="stack">
          {eb && (
            <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h2 style={{ fontSize: 18 }}>Güven etiketi ne kadar doğru?</h2>
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
              <h2 style={{ fontSize: 18 }}>Olasılıklar gerçeği yansıtıyor mu?</h2>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                Rinvalo bir sonuca belli bir yüzde verdiğinde o sonuç gerçekte ne sıklıkla gerçekleşti:
              </p>
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
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                Çubuk gerçekleşen oranı, çizgi tahmin edilen oranı gösterir. Çizgiyle çubuğun ucu ne kadar yakınsa olasılıklar o kadar güvenilir.
              </p>
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
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>Bu sezon: Rinvalo vs piyasa</h2>
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
                Aynı {vs.length} maçta 1-X-2 isabeti.
              </p>
            </section>
          )}

          <Link href="/nasil" className="btn ghost">
            Model nasıl çalışıyor?
          </Link>
        </aside>
      </div>
    </>
  );
}
