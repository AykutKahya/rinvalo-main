import Link from "next/link";
import { CountUp } from "@/components/CountUp";
import { Crest } from "@/components/Crest";
import { MatchBrowser } from "@/components/MatchBrowser";
import { ProbBar } from "@/components/ProbBar";
import { accuracy, getEngineBacktest, getMatches, getSimulation, LEAGUES } from "@/lib/data";
import { dayKey, pct, shortDay, time } from "@/lib/format";
import { closestPicks, lite, matchOfTheWeek, surestPicks } from "@/lib/picks";
import { team } from "@/lib/teams";

const DAY = 86_400_000;

export default function Home() {
  const now = Date.now();
  const all = getMatches();
  const sim = getSimulation();
  const window = all.filter((m) => {
    const k = Date.parse(m.kickoff);
    return k > now - 10 * DAY && k < now + 21 * DAY;
  });
  const days = [...new Set(window.map((m) => dayKey(m.kickoff)))].sort();
  const today = dayKey(now);
  const initialDay = days.includes(today) ? today : (days.find((d) => d >= today) ?? days[days.length - 1] ?? today);

  const motw = matchOfTheWeek(all, sim, now);
  const surest = surestPicks(all, now);
  const closest = closestPicks(all, now);
  const record = accuracy(all);
  const eb = getEngineBacktest();
  const race = (sim.leagues["super-lig"] ?? []).slice(0, 4);

  return (
    <div className="home-grid">
      <MatchBrowser matches={window.map(lite)} leagues={LEAGUES} initialDay={initialDay} />

      <aside className="side-stack" aria-label="Öne çıkanlar">
        {motw && motw.prediction && (
          <div className="card feature reveal">
            <div className="section-title" style={{ margin: 0 }}>
              <span className="eyebrow">Haftanın maçı</span>
              <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>
                {shortDay(motw.kickoff)} {time(motw.kickoff)}
              </span>
            </div>
            <Link href={`/mac/${motw.id}`} className="vs">
              <span>
                <Crest slug={motw.home} size="md" />
                <br />
                {team(motw.home).name}
              </span>
              <span className="big">
                {motw.prediction.score[0]}-{motw.prediction.score[1]}
              </span>
              <span>
                <Crest slug={motw.away} size="md" />
                <br />
                {team(motw.away).name}
              </span>
            </Link>
            <ProbBar p={motw.prediction.p} />
            <div className="kv-grid">
              <div className="kv">
                <small>2.5 Üst</small>
                <b>
                  <CountUp value={motw.prediction.over25} />
                </b>
              </div>
              <div className="kv">
                <small>Karşılıklı gol</small>
                <b>
                  <CountUp value={motw.prediction.btts} />
                </b>
              </div>
            </div>
            <Link href={`/mac/${motw.id}`} className="btn">
              Maç detayı ve senin tahminin →
            </Link>
          </div>
        )}

        <div className="card card-pad">
          <div className="section-title">
            <h2 style={{ fontSize: 15 }}>En net tahminler</h2>
          </div>
          <div className="mini-list">
            {surest.map((m) => {
              const i = m.prediction!.p.indexOf(Math.max(...m.prediction!.p));
              const who = i === 0 ? team(m.home).name : i === 2 ? team(m.away).name : "Beraberlik";
              return (
                <Link key={m.id} href={`/mac/${m.id}`} className="mini-item">
                  <span className="mi-t">
                    {team(m.home).short} – {team(m.away).short} · {who}
                  </span>
                  <span className="pill good">{pct(m.prediction!.p[i])}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="card card-pad">
          <div className="section-title">
            <h2 style={{ fontSize: 15 }}>En çekişmeli maçlar</h2>
          </div>
          <div className="mini-list">
            {closest.map((m) => (
              <Link key={m.id} href={`/mac/${m.id}`} className="mini-item">
                <span className="mi-t">
                  {team(m.home).name} – {team(m.away).name}
                </span>
                <span className="num muted" style={{ fontSize: 12 }}>
                  {m.prediction!.p.map((v) => Math.round(v * 100)).join("·")}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {race.length > 0 && (
          <div className="card card-pad">
            <div className="section-title">
              <h2 style={{ fontSize: 15 }}>Süper Lig şampiyonluk ihtimali</h2>
              <Link href="/lig/super-lig#ihtimaller">Tümü</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {race.map((r) => (
                <Link key={r.team} href={`/takim/${r.team}`} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, alignItems: "center", fontSize: 13.5, fontWeight: 600 }}>
                  <span className="tname">
                    <Crest slug={r.team} size="sm" />
                    {team(r.team).name}
                  </span>
                  <span className="odds-bar" style={{ ["--bar" as string]: team(r.team).colors[0] === "#ffffff" ? "var(--accent)" : team(r.team).colors[0] }}>
                    <span style={{ width: `${Math.max(r.champion * 100, 2)}%` }} />
                    <em>{pct(r.champion)}</em>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link href="/analiz/basari" className="acc-box">
          {record.n >= 10 ? (
            <>
              <b>{pct(record.hits / record.n)}</b>
              <span>Bu sezon {record.n} maçta isabet</span>
            </>
          ) : (
            <>
              <b>{eb ? pct(eb.byConfidence.high.accuracy) : "–"}</b>
              <span>Yüksek güvenli tahminlerde isabet</span>
            </>
          )}
        </Link>
      </aside>
    </div>
  );
}
