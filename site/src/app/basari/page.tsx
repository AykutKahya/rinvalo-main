import type { Metadata } from "next";
import Link from "next/link";
import { CountUp } from "@/components/CountUp";
import { LeagueMark } from "@/components/Crest";
import { MatchRow } from "@/components/MatchRow";
import { accuracy, getBacktest, getMatches, LEAGUES } from "@/lib/data";
import { pct } from "@/lib/format";

export const metadata: Metadata = { title: "Tahmin başarısı", description: "Rinvalo tahminlerinin bu sezon ve geçmiş sezon testindeki isabet oranı." };

export default function AccuracyPage() {
  const all = getMatches();
  const graded = all.filter((m) => m.hit !== null).sort((a, b) => b.kickoff.localeCompare(a.kickoff));
  const record = accuracy(all);
  const bt = getBacktest();

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
          <span>1-X-2 isabeti</span>
        </div>
        <div className="card stat">
          <b>{record.n ? pct(record.exact / record.n) : "–"}</b>
          <span>Tam skor isabeti</span>
        </div>
        <div className="card stat">
          <b>{bt.total ? <CountUp value={bt.total.accuracy} /> : "–"}</b>
          <span>Geçmiş iki sezon testi</span>
        </div>
      </div>

      <div className="match-grid">
        <div className="stack">
          <section className="card group" style={{ margin: 0 }}>
            <div className="group-head">
              <span>Sonuçlanan tahminler</span>
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
          <section className="card card-pad">
            <div className="section-title">
              <h2 style={{ fontSize: 16 }}>Lig lig</h2>
            </div>
            <div className="table-wrap">
              <table className="std">
                <thead>
                  <tr>
                    <th>Lig</th>
                    <th className="c">Bu sezon</th>
                    <th className="c">Test</th>
                  </tr>
                </thead>
                <tbody>
                  {LEAGUES.map((l) => {
                    const r = accuracy(all.filter((m) => m.league === l.code));
                    const b = bt[l.code];
                    return (
                      <tr key={l.code}>
                        <td>
                          <Link href={`/lig/${l.code}`} className="tname">
                            <LeagueMark code={l.code} accent={l.accent} />
                            {l.name}
                          </Link>
                        </td>
                        <td className="c">{r.n ? `${pct(r.hits / r.n)} (${r.n})` : "–"}</td>
                        <td className="c">{b ? pct(b.accuracy) : "–"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 16 }}>Geçmiş sezon testi nedir?</h2>
            <p style={{ margin: 0, color: "var(--ink-2)", fontSize: 14 }}>
              Model 2024-25 ve 2025-26 sezonlarının {bt.total?.matches ?? 0} maçında, her hafta yalnız o güne kadarki sonuçlarla yeniden kuruldu ve sonraki haftayı tahmin etti.
            </p>
            {bt.total && (
              <div className="mini-list">
                <div className="mini-item">
                  <span>Rinvalo 1-X-2 isabeti</span>
                  <b>{pct(bt.total.accuracy, 1)}</b>
                </div>
                <div className="mini-item">
                  <span>Bahis şirketlerinin favorisi</span>
                  <b>%54,0</b>
                </div>
                <div className="mini-item">
                  <span>Her maça &quot;ev sahibi&quot; demek</span>
                  <b>{pct(bt.total.alwaysHome, 1)}</b>
                </div>
                <div className="mini-item">
                  <span>Tam skor isabeti</span>
                  <b>{pct(bt.total.exactScore, 1)}</b>
                </div>
              </div>
            )}
            <Link href="/nasil" className="btn ghost">
              Model nasıl çalışıyor?
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}
