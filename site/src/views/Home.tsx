import Link from "next/link";
import { CountUp } from "@/components/CountUp";
import { Crest } from "@/components/Crest";
import { MatchBrowser } from "@/components/MatchBrowser";
import { ProbBar } from "@/components/ProbBar";
import { accuracy, getEngineBacktest, getMatches, getSimulation } from "@/lib/data";
import { fmt } from "@/lib/format";
import { dict, paths, type Lang } from "@/lib/i18n";
import { competitions } from "@/lib/leagues";
import { closestPicks, lite, matchOfTheWeek, surestPicks } from "@/lib/picks";
import { team } from "@/lib/teams";

const DAY = 86_400_000;

export function Home({ lang }: { lang: Lang }) {
  const f = fmt(lang);
  const t = dict(lang);
  const h = t.home;
  const p = paths(lang);
  const name = (slug: string) => team(slug, lang).name;
  const now = Date.now();
  const all = getMatches();
  const sim = getSimulation();
  const window = all.filter((m) => {
    const k = Date.parse(m.kickoff);
    return k > now - 10 * DAY && k < now + 21 * DAY;
  });
  const days = [...new Set(window.map((m) => f.dayKey(m.kickoff)))].sort();
  const today = f.dayKey(now);
  const initialDay = days.includes(today) ? today : (days.find((d) => d >= today) ?? days[days.length - 1] ?? today);

  const motw = matchOfTheWeek(all, sim, now);
  const surest = surestPicks(all, now);
  const closest = closestPicks(all, now);
  const record = accuracy(all);
  const eb = getEngineBacktest();
  const race = (sim.leagues["super-lig"] ?? []).slice(0, 4);

  return (
    <div className="home-grid">
      <MatchBrowser matches={window.map(lite)} leagues={competitions(lang)} initialDay={initialDay} lang={lang} />

      <aside className="side-stack" aria-label={h.highlights}>
        {motw && motw.prediction && (
          <div className="card feature reveal">
            <div className="section-title" style={{ margin: 0 }}>
              <span className="eyebrow">{h.motw}</span>
              <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>
                {f.shortDay(motw.kickoff)} {f.time(motw.kickoff)}
              </span>
            </div>
            <Link href={p.matchOf(motw.id)} className="vs">
              <span>
                <Crest slug={motw.home} size="md" />
                <br />
                {name(motw.home)}
              </span>
              <span className="big">
                {motw.prediction.score[0]}-{motw.prediction.score[1]}
              </span>
              <span>
                <Crest slug={motw.away} size="md" />
                <br />
                {name(motw.away)}
              </span>
            </Link>
            <ProbBar p={motw.prediction.p} lang={lang} />
            <div className="kv-grid">
              <div className="kv">
                <small>{h.over25}</small>
                <b>
                  <CountUp value={motw.prediction.over25} lang={lang} />
                </b>
              </div>
              <div className="kv">
                <small>{h.btts}</small>
                <b>
                  <CountUp value={motw.prediction.btts} lang={lang} />
                </b>
              </div>
            </div>
            <Link href={p.matchOf(motw.id)} className="btn">
              {h.motwCta}
            </Link>
          </div>
        )}

        <div className="card card-pad">
          <div className="section-title">
            <h2 style={{ fontSize: 15 }}>{h.surest}</h2>
          </div>
          <div className="mini-list">
            {surest.map((m) => {
              const i = m.prediction!.p.indexOf(Math.max(...m.prediction!.p));
              const who = i === 0 ? name(m.home) : i === 2 ? name(m.away) : t.draw;
              return (
                <Link key={m.id} href={p.matchOf(m.id)} className="mini-item">
                  <span className="mi-t">
                    {team(m.home).short} – {team(m.away).short} · {who}
                  </span>
                  <span className="pill good">{f.pct(m.prediction!.p[i])}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="card card-pad">
          <div className="section-title">
            <h2 style={{ fontSize: 15 }}>{h.closest}</h2>
          </div>
          <div className="mini-list">
            {closest.map((m) => (
              <Link key={m.id} href={p.matchOf(m.id)} className="mini-item">
                <span className="mi-t">
                  {name(m.home)} – {name(m.away)}
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
              <h2 style={{ fontSize: 15 }}>{h.race}</h2>
              <Link href={`${p.leagueOf("super-lig")}#ihtimaller`}>{h.all}</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {race.map((r) => (
                <Link key={r.team} href={p.teamOf(r.team)} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, alignItems: "center", fontSize: 13.5, fontWeight: 600 }}>
                  <span className="tname">
                    <Crest slug={r.team} size="sm" />
                    {name(r.team)}
                  </span>
                  <span className="odds-bar" style={{ ["--bar" as string]: team(r.team).colors[0] === "#ffffff" ? "var(--accent)" : team(r.team).colors[0] }}>
                    <span style={{ width: `${Math.max(r.champion * 100, 2)}%` }} />
                    <em>{f.pct(r.champion)}</em>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link href={p.accuracy} className="acc-box">
          {record.n >= 10 ? (
            <>
              <b>{f.pct(record.hits / record.n)}</b>
              <span>{h.seasonHits(record.n)}</span>
            </>
          ) : (
            <>
              <b>{eb ? f.pct(eb.byConfidence.high.accuracy) : "–"}</b>
              <span>{h.highHits}</span>
            </>
          )}
        </Link>
      </aside>
    </div>
  );
}
