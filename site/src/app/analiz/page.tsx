import type { Metadata } from "next";
import Link from "next/link";
import { ConfidencePill } from "@/components/Confidence";
import { CountUp } from "@/components/CountUp";
import { Crest, LeagueMark } from "@/components/Crest";
import { accuracy, getEngineBacktest, getMatches, getRatings, LEAGUES } from "@/lib/data";
import { pct } from "@/lib/format";
import { disagreements, shocks, upsetRisks } from "@/lib/picks";
import { team } from "@/lib/teams";

export const metadata: Metadata = { title: "Analiz", description: "Güç sıralaması, haftanın sürprizleri ve tahmin başarısı." };

export default function AnalysisHub() {
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
          <h1>Analiz</h1>
        </div>
      </div>

      <div className="hub-grid">
        <Link href="/analiz/guc" className="card card-pad hub-card reveal">
          <span className="eyebrow">Güç sıralaması</span>
          <h2>Liglerin zirvesi</h2>
          <div className="mini-list">
            {LEAGUES.filter((l) => leagues[l.code]?.length).map((l) => {
              const r = leagues[l.code][0];
              return (
                <div key={l.code} className="mini-item">
                  <span className="tname">
                    <LeagueMark code={l.code} accent={l.accent} />
                    <Crest slug={r.team} size="sm" />
                    {team(r.team).name}
                  </span>
                  <b className="num">{Math.round(r.elo)}</b>
                </div>
              );
            })}
          </div>
          <span className="hub-more">Tüm sıralama →</span>
        </Link>

        <Link href="/analiz/surprizler" className="card card-pad hub-card reveal">
          <span className="eyebrow">Haftanın sürprizleri</span>
          <h2>{shock ? `${team(shock.m.home).name} ${shock.m.hg}-${shock.m.ag} ${team(shock.m.away).name}` : "Favoriler tehlikede mi?"}</h2>
          {shock && <p className="muted">Bu sonuca {pct(shock.chance)} ihtimal verilmişti.</p>}
          <div className="mini-list">
            {risks.map(({ m, dog }) => (
              <div key={m.id} className="mini-item">
                <span className="tname">
                  <Crest slug={m.home} size="sm" />
                  <Crest slug={m.away} size="sm" />
                  {team(m.home).short} – {team(m.away).short}
                </span>
                <span className="muted" style={{ fontSize: 12.5 }}>
                  Sürpriz <b className="num tone-warn">{pct(dog)}</b>
                </span>
              </div>
            ))}
          </div>
          {nDiff > 0 && <p className="muted">Piyasayla ayrışan {nDiff} maç</p>}
          <span className="hub-more">Tümünü gör →</span>
        </Link>

        <Link href="/analiz/basari" className="card card-pad hub-card reveal">
          <span className="eyebrow">Tahmin başarısı</span>
          <h2>Son 3 sezon</h2>
          <div className="kv-grid">
            <div className="kv">
              <small>Genel isabet</small>
              <b>{eb ? <CountUp value={eb.overall["Rinvalo modeli"].accuracy} /> : "–"}</b>
            </div>
            <div className="kv">
              <small>Test edilen maç</small>
              <b>{eb ? eb.overall["Rinvalo modeli"].matches.toLocaleString("tr-TR") : "–"}</b>
            </div>
          </div>
          {eb && (
            <div className="mini-list">
              {(["high", "medium", "low"] as const).map((k) => (
                <div key={k} className="mini-item">
                  <ConfidencePill level={k} />
                  <b className="num">{pct(eb.byConfidence[k].accuracy)}</b>
                </div>
              ))}
            </div>
          )}
          {record.n > 0 && (
            <p className="muted">
              Bu sezon {record.n} maçta {pct(record.hits / record.n)}
            </p>
          )}
          <span className="hub-more">Ayrıntılar →</span>
        </Link>
      </div>
    </>
  );
}
