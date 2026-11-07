import Link from "next/link";
import { CountUp } from "@/components/CountUp";
import { Crest } from "@/components/Crest";
import { JsonLd } from "@/components/JsonLd";
import { MatchBrowser } from "@/components/MatchBrowser";
import { LeagueMark } from "@/components/Crest";
import { FavoritesStrip } from "@/components/FavoritesStrip";
import { PredictorCard } from "@/components/PredictorCard";
import { nation } from "@/lib/nations";
import { Badge } from "@/views/National";
import { Pulse } from "@/components/Pulse";
import { ProbBar } from "@/components/ProbBar";
import { accuracy, getEngineBacktest, getInternational, getMatches, getSimulation, leagueMatches } from "@/lib/data";
import { fmt } from "@/lib/format";
import { dict, paths, roundLabel, type Lang } from "@/lib/i18n";
import { siteUrl } from "@/lib/site";
import { competitions } from "@/lib/leagues";
import { closestPicks, lite, matchOfTheWeek, surestPicks } from "@/lib/picks";
import { team } from "@/lib/teams";
import { TeamPair } from "@/components/TeamPair";

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
    return k > now - 4 * DAY && k < now + 14 * DAY;
  });
  const days = [...new Set(window.map((m) => f.dayKey(m.kickoff)))].sort();
  // One list for both browser components: React sends a shared object once.
  const slim = window.map(lite);
  const today = f.dayKey(now);
  const initialDay = days.includes(today) ? today : (days.find((d) => d >= today) ?? days[days.length - 1] ?? today);

  const motw = matchOfTheWeek(all, sim, now);
  // Türkiye's next game, when it is this week.
  const turkey = getInternational().games.find((g) => g.hg === null && g.pred && (g.home === "Turkey" || g.away === "Turkey") && Date.parse(g.kickoff) > now && Date.parse(g.kickoff) < now + 10 * DAY);
  const surest = surestPicks(all, now);
  const closest = closestPicks(all, now);
  // Each competition's round in play or next up, for the round pages.
  const weeks = competitions(lang).flatMap((c) => {
    const next = leagueMatches(c.code)
      .filter((m) => m.status !== "finished" && Date.parse(m.kickoff) > now - 3 * 3600_000)
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0];
    return next && Date.parse(next.kickoff) - now < 10 * DAY ? [{ ...c, round: next.round }] : [];
  });
  const record = accuracy(all);
  const eb = getEngineBacktest();
  const race = (sim.leagues["super-lig"] ?? []).slice(0, 4);

  return (
    <>
      <FavoritesStrip matches={slim} lang={lang} />
      {turkey && (
        <Link href={p.national} className="card card-pad nat-next">
          <span className="eyebrow">{h.nationalNext}</span>
          <span className="nat-next-row">
            <Badge name={turkey.home} />
            <b>{nation(turkey.home, lang)}</b>
            <span className="big-pick num">
              <small>{h.predTag}</small>
              {turkey.pred!.score[0]}-{turkey.pred!.score[1]}
            </span>
            <b>{nation(turkey.away, lang)}</b>
            <Badge name={turkey.away} />
          </span>
          <small className="muted">
            {f.shortDay(turkey.kickoff)} {f.time(turkey.kickoff)} · 1 {f.pct(turkey.pred!.p[0])} · X {f.pct(turkey.pred!.p[1])} · 2 {f.pct(turkey.pred!.p[2])}
          </small>
        </Link>
      )}
      <section className="hero" aria-label={h.highlights}>
        {motw && motw.prediction && (
          <div className="card feature hero-motw reveal">
            <div className="section-title" style={{ margin: 0 }}>
              <span className="eyebrow">{h.motw}</span>
              <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>
                {f.shortDay(motw.kickoff)} {f.time(motw.kickoff)}
              </span>
            </div>
            <Link href={p.matchOf(motw.id)} className="vs">
              <span>
                <Crest slug={motw.home} size="lg" />
                <br />
                {name(motw.home)}
              </span>
              <span className="big">
                <small className="big-label">{h.predTag}</small>
                {motw.prediction.score[0]}-{motw.prediction.score[1]}
              </span>
              <span>
                <Crest slug={motw.away} size="lg" />
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

        <div className="hero-side">
          <div className="card card-pad hero-sure">
            <div className="section-title" style={{ margin: 0 }}>
              <h2 style={{ fontSize: 15 }}>{h.surest}</h2>
            </div>
            <div className="sure-list">
              {surest.map((m) => {
                const i = m.prediction!.p.indexOf(Math.max(...m.prediction!.p));
                return (
                  <Link key={m.id} href={p.matchOf(m.id)} className="sure">
                    <span className="sure-crests">
                      <Crest slug={m.home} size="md" />
                      <Crest slug={m.away} size="md" />
                    </span>
                    <span className="sure-txt">
                      <small>
                        {name(m.home)} – {name(m.away)} · {f.shortDay(m.kickoff)} {f.time(m.kickoff)}
                      </small>
                      <b>{i === 1 ? h.drawPick : h.winPick(i === 0 ? name(m.home) : name(m.away))}</b>
                    </span>
                    <span className="sure-pct num">{f.pct(m.prediction!.p[i])}</span>
                  </Link>
                );
              })}
            </div>
          </div>
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
        </div>
      </section>
    <div className="home-grid">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Rinvalo",
            url: `${siteUrl}${paths(lang).home}`,
            inLanguage: lang,
            description: dict(lang).siteDescription,
          },
          { "@context": "https://schema.org", "@type": "Organization", name: "Rinvalo", url: siteUrl, logo: `${siteUrl}/brand/icon-512.png` },
        ]}
      />
      <MatchBrowser matches={slim} leagues={competitions(lang)} initialDay={initialDay} lang={lang} />

      <aside className="side-stack" aria-label={h.highlights}>
        <PredictorCard lang={lang} />
        <Pulse lang={lang} now={now} />

        <div className="card card-pad">
          <div className="section-title">
            <h2 style={{ fontSize: 15 }}>{h.closest}</h2>
          </div>
          <div className="mini-list">
            {closest.map((m) => (
              <Link key={m.id} href={p.matchOf(m.id)} className="mini-item">
                <TeamPair home={m.home} away={m.away} lang={lang} />
                <span className="num muted" style={{ fontSize: 12 }}>
                  {m.prediction!.p.map((v, i) => `${["1", "X", "2"][i]} ${Math.round(v * 100)}`).join(" · ")}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {weeks.length > 0 && (
          <div className="card card-pad">
            <div className="section-title">
              <h2 style={{ fontSize: 15 }}>{h.weeks}</h2>
            </div>
            <div className="week-links">
              {weeks.map((w) => (
                <Link key={w.code} href={p.weekOf(w.code, w.round)}>
                  <LeagueMark code={w.code} accent={w.accent} />
                  <span>{w.name}</span>
                  <span>{roundLabel(lang, w.code, w.round)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {race.length > 0 && (
          <div className="card card-pad">
            <div className="section-title">
              <h2 style={{ fontSize: 15 }}>{h.race}</h2>
              <Link href={`${p.leagueOf("super-lig")}#ihtimaller`}>{h.all}</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {race.map((r) => (
                <Link
                  key={r.team}
                  href={p.teamOf(r.team)}
                  style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, alignItems: "center", fontSize: 13.5, fontWeight: 600 }}
                >
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

      </aside>
    </div>
    </>
  );
}
