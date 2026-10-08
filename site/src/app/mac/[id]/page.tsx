import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ConfidencePill } from "@/components/Confidence";
import { Countdown } from "@/components/Countdown";
import { CountUp } from "@/components/CountUp";
import { Crest } from "@/components/Crest";
import { GuessWidget } from "@/components/GuessWidget";
import { MarketCompare } from "@/components/MarketCompare";
import { ProbBar } from "@/components/ProbBar";
import { ScoreGrid } from "@/components/ScoreGrid";
import { Form, StandingsTable } from "@/components/StandingsTable";
import { getMarket, getMatch, getMatches, headToHead, leagueMatches, leagueTable } from "@/lib/data";
import { fullDate, longDay, pct, time } from "@/lib/format";
import { leagueByCode } from "@/lib/leagues";
import { pickOf } from "@/lib/model";
import { team } from "@/lib/teams";

export function generateStaticParams() {
  return getMatches().map((m) => ({ id: m.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/mac/[id]">): Promise<Metadata> {
  const { id } = await params;
  const m = getMatch(id);
  if (!m) return {};
  const h = team(m.home).name;
  const a = team(m.away).name;
  const p = m.prediction;
  return {
    title: `${h} – ${a} tahmini`,
    description: p
      ? `${h} – ${a} maçı için Rinvalo tahmini: ${p.score[0]}-${p.score[1]}. Ev sahibi ${pct(p.p[0])}, beraberlik ${pct(p.p[1])}, deplasman ${pct(p.p[2])}.`
      : `${h} – ${a} maç sayfası.`,
  };
}

export default async function MatchPage({ params }: PageProps<"/mac/[id]">) {
  const { id } = await params;
  const m = getMatch(id);
  if (!m) notFound();
  const league = leagueByCode(m.league)!;
  const h = team(m.home);
  const a = team(m.away);
  const p = m.prediction;
  const finished = m.status === "finished";
  const actual: [number, number] | null = finished ? [m.hg!, m.ag!] : null;

  const table = leagueTable(m.league);
  const hi = table.findIndex((r) => r.team === m.home);
  const ai = table.findIndex((r) => r.team === m.away);
  const near = [...new Set([hi - 1, hi, hi + 1, ai - 1, ai, ai + 1])].filter((i) => i >= 0 && i < table.length);
  const h2h = headToHead(m.home, m.away);
  const nextUp = leagueMatches(m.league).filter((x) => x.round === m.round && x.id !== m.id);

  const heroStyle = { "--hc": h.colors[0] === "#ffffff" ? h.colors[1] : h.colors[0], "--ac": a.colors[0] === "#ffffff" ? a.colors[1] : a.colors[0] } as CSSProperties;

  return (
    <article>
      <div className="card match-hero reveal" style={heroStyle}>
        <div className="mh-top">
          <Link href={`/lig/${league.code}`}>
            {league.name} · {m.round}. hafta
          </Link>
          <span>
            {longDay(m.kickoff)} · {time(m.kickoff)}
            {m.venue ? ` · ${m.venue}` : ""}
          </span>
        </div>
        <div className="mh-teams">
          <Link href={`/takim/${m.home}`} className="mh-team" lang={m.league === "super-lig" ? "tr" : "en"}>
            <Crest slug={m.home} size="lg" />
            {h.name}
            {hi >= 0 && <small>{hi + 1}. sırada</small>}
          </Link>
          <div className="mh-center">
            {finished ? (
              <>
                <span className="mh-label">Maç sonucu</span>
                <span className="mh-score">
                  {m.hg}-{m.ag}
                </span>
                {m.hit !== null && <span className={`pill ${m.hit ? "good" : "bad"}`}>{m.exact ? "Tam skor tuttu" : m.hit ? "Tahmin tuttu" : "Tahmin tutmadı"}</span>}
              </>
            ) : m.status === "postponed" ? (
              <>
                <span className="mh-label">Ertelendi</span>
                <span className="mh-score muted">–</span>
              </>
            ) : (
              <>
                <span className="mh-label">Rinvalo tahmini</span>
                <span className="mh-score">{p ? `${p.score[0]}-${p.score[1]}` : "–"}</span>
                <ConfidencePill level={p?.confidence} />
              </>
            )}
          </div>
          <Link href={`/takim/${m.away}`} className="mh-team" lang={m.league === "super-lig" ? "tr" : "en"}>
            <Crest slug={m.away} size="lg" />
            {a.name}
            {ai >= 0 && <small>{ai + 1}. sırada</small>}
          </Link>
        </div>
        {m.status === "scheduled" && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Countdown to={m.kickoff} />
          </div>
        )}
        {p && <ProbBar p={p.p} labels={[h.short, "X", a.short]} />}
      </div>

      <div className="match-grid">
        <div className="stack">
          {p && (
            <MarketCompare rinvalo={p.p} market={p.market ?? getMarket()[m.id] ?? null} home={h.name} away={a.name} finished={finished} lang={m.league === "super-lig" ? "tr" : "en"} />
          )}
          {p ? (
            <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="section-title" style={{ margin: 0 }}>
                <h2>Tahmin</h2>
                {finished && <span className="muted" style={{ fontSize: 13 }}>Tahmin: {p.score[0]}-{p.score[1]}</span>}
              </div>
              {p.reasons && p.reasons.length > 0 && (
                <div className="why-box">
                  <div className="eyebrow">Öne çıkanlar</div>
                  <ul>
                    {p.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="kv-grid four">
                <div className="kv">
                  <small>Beklenen gol</small>
                  <b>
                    {p.lh.toFixed(1).replace(".", ",")} – {p.la.toFixed(1).replace(".", ",")}
                  </b>
                </div>
                <div className="kv">
                  <small>2.5 Üst</small>
                  <b>
                    <CountUp value={p.over25} />
                  </b>
                </div>
                <div className="kv">
                  <small>Karşılıklı gol</small>
                  <b>
                    <CountUp value={p.btts} />
                  </b>
                </div>
                <div className="kv">
                  <small>En olası skor</small>
                  <b>
                    {p.top[0][0]}-{p.top[0][1]}
                  </b>
                </div>
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  Skor olasılıkları (%)
                </div>
                <ScoreGrid grid={p.grid} home={h.name} away={a.name} actual={actual} />
              </div>
            </section>
          ) : (
            <section className="card empty">
              <b>Tahmin yok</b>
            </section>
          )}

          <section className="card card-pad">
            <div className="section-title">
              <h2>Form</h2>
              <span className="muted" style={{ fontSize: 13 }}>Son 5 lig maçı</span>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {[hi, ai].map((i, k) =>
                i >= 0 ? (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <Link href={`/takim/${table[i].team}`} className="tname">
                      <Crest slug={table[i].team} size="sm" />
                      {team(table[i].team).name}
                    </Link>
                    <Form form={table[i].form} />
                  </div>
                ) : null,
              )}
            </div>
          </section>

          {h2h.length > 0 && (
            <section className="card card-pad">
              <div className="section-title">
                <h2>Aralarındaki son maçlar</h2>
              </div>
              <div className="mini-list">
                {h2h.map((x) => (
                  <div key={x.date + x.home} className="mini-item">
                    <span className="mi-t">
                      {team(x.home).name} – {team(x.away).name}
                    </span>
                    <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {fullDate(x.date)}
                      </span>
                      <b className="num">
                        {x.hg}-{x.ag}
                      </b>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="stack">
          <GuessWidget id={m.id} home={h.name} away={a.name} kickoff={m.kickoff} model={p ? p.score : null} actual={actual} />
          {table.some((r) => r.played > 0) && (
            <section className="card card-pad">
              <div className="section-title">
                <h2 style={{ fontSize: 16 }}>Puan durumu</h2>
                <Link href={`/lig/${league.code}`}>Tam tablo</Link>
              </div>
              <StandingsTable rows={table} league={league} highlight={[m.home, m.away]} only={near} compact />
            </section>
          )}
          {nextUp.length > 0 && (
            <section className="card card-pad">
              <div className="section-title">
                <h2 style={{ fontSize: 16 }}>Haftanın diğer maçları</h2>
              </div>
              <div className="mini-list">
                {nextUp.slice(0, 9).map((x) => (
                  <Link key={x.id} href={`/mac/${x.id}`} className="mini-item">
                    <span className="mi-t" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Crest slug={x.home} size="sm" />
                      {team(x.home).short}
                      <span className="muted">–</span>
                      {team(x.away).short}
                      <Crest slug={x.away} size="sm" />
                    </span>
                    <b className="num" style={{ fontSize: 13 }}>
                      {x.status === "finished" ? `${x.hg}-${x.ag}` : x.prediction ? `${x.prediction.score[0]}-${x.prediction.score[1]}` : time(x.kickoff)}
                    </b>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
