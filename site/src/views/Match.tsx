import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { withBrand } from "@/components/Brand";
import { ConfidencePill } from "@/components/Confidence";
import { Countdown } from "@/components/Countdown";
import { CountUp } from "@/components/CountUp";
import { Crest } from "@/components/Crest";
import { FairOdds } from "@/components/FairOdds";
import { GuessWidget } from "@/components/GuessWidget";
import { LiveMatch } from "@/components/LiveMatch";
import { MarketCompare } from "@/components/MarketCompare";
import { ProbBar } from "@/components/ProbBar";
import { ScoreGrid } from "@/components/ScoreGrid";
import { crumbs, JsonLd } from "@/components/JsonLd";
import { NotifyButton } from "@/components/NotifyButton";
import { ShareButton } from "@/components/ShareButton";
import { Stakes, TieOdds } from "@/components/Stakes";
import { Form, StandingsTable } from "@/components/StandingsTable";
import { getMarket, getSquads, getMatch, getMatches, getSimulation, headToHead, leagueMatches, leagueTable, teamLeague } from "@/lib/data";
import { fmt } from "@/lib/format";
import { alternates, dict, paths, roundLabel, type Lang } from "@/lib/i18n";
import { competitionName, isCup, leagueByCode, nameLang, zonesOf } from "@/lib/leagues";
import { pickOf } from "@/lib/model";
import { siteUrl } from "@/lib/site";
import { stakesOf } from "@/lib/stakes";
import { firstGoalMinute, liveOdds } from "@/lib/live";
import { team } from "@/lib/teams";
import { TeamPair } from "@/components/TeamPair";
import { Squads } from "@/components/Squads";

const DAY = 86_400_000;

/** Pages built ahead: the games around today. Older and later games render on first visit. */
export function matchParams() {
  const now = Date.now();
  return getMatches()
    .filter((m) => Math.abs(Date.parse(m.kickoff) - now) < 10 * DAY)
    .map((m) => ({ id: m.id }));
}

export function matchMetadata(id: string, lang: Lang): Metadata {
  const m = getMatch(id);
  if (!m) return {};
  const t = dict(lang).match;
  const { pct } = fmt(lang);
  const h = team(m.home, lang).name;
  const a = team(m.away, lang).name;
  const p = m.prediction;
  return {
    title: t.title(h, a),
    description: p ? t.description(h, a, `${p.score[0]}-${p.score[1]}`, pct(p.p[0]), pct(p.p[1]), pct(p.p[2])) : t.descriptionNone(h, a),
    alternates: alternates(lang, "match", `/${id}`),
    openGraph: { images: [{ url: `/og/${lang}/${id}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [`/og/${lang}/${id}`] },
  };
}

export function Match({ id, lang }: { id: string; lang: Lang }) {
  const m = getMatch(id);
  if (!m) notFound();
  const f = fmt(lang);
  const t = dict(lang);
  const tm = t.match;
  const path = paths(lang);
  const compName = competitionName(m.league, lang);
  const cup = isCup(m.league);
  const h = team(m.home, lang);
  const a = team(m.away, lang);
  const nl = nameLang(m.league);
  // Cup games mix countries, so each name gets the language of its own league.
  const langOf = (slug: string) => (cup ? nameLang(teamLeague(slug) ?? "") : nl);
  const p = m.prediction;
  const finished = m.status === "finished";
  const actual: [number, number] | null = finished ? [m.hg!, m.ag!] : null;
  // Absentees from the squad feed, next to the engine's reasons (they do not change the prediction).
  const sq = finished ? undefined : getSquads()[m.id];
  const squadLines: string[] = [];
  if (sq?.absent) {
    const ts = dict(lang).squads;
    const out = (s: "home" | "away") => sq.absent![s].filter((x) => x.kind === "out");
    const [ho, ao] = [out("home"), out("away")];
    squadLines.push(ts.count(h.name, ho.length, a.name, ao.length));
    // Three or more extra absentees: a small but real edge in the backtest (engine/README.md).
    if (Math.abs(ho.length - ao.length) >= 3) squadLines.push(ts.lean(ho.length > ao.length ? a.name : h.name));
    for (const [s, t] of [["home", h.name], ["away", a.name]] as const) {
      const banned = sq.absent[s].filter((x) => /suspend|red card|yellow card/i.test(x.reason)).map((x) => x.name);
      if (banned.length) squadLines.push(ts.banned(t, banned.join(", ")));
      const doubts = sq.absent[s].filter((x) => x.kind === "doubt").map((x) => x.name);
      if (doubts.length && doubts.length <= 4) squadLines.push(ts.doubts(t, doubts.join(", ")));
    }
  }
  if (sq?.lineups) squadLines.push(dict(lang).squads.lineupsIn);
  const reasons = [...((lang === "en" ? p?.reasonsEn : p?.reasons) ?? []), ...squadLines];

  const table = leagueTable(m.league);
  const hi = table.findIndex((r) => r.team === m.home);
  const ai = table.findIndex((r) => r.team === m.away);
  const near = [...new Set([hi - 1, hi, hi + 1, ai - 1, ai, ai + 1])].filter((i) => i >= 0 && i < table.length);
  const h2h = headToHead(m.home, m.away);
  const nextUp = leagueMatches(m.league).filter((x) => x.round === m.round && x.id !== m.id);

  const heroStyle = { "--hc": h.colors[0] === "#ffffff" ? h.colors[1] : h.colors[0], "--ac": a.colors[0] === "#ffffff" ? a.colors[1] : a.colors[0] } as CSSProperties;

  // Structured data so search engines can show the fixture as a sports event.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${h.name} – ${a.name}`,
    startDate: m.kickoff,
    sport: "Football",
    eventStatus: m.status === "postponed" ? "https://schema.org/EventPostponed" : "https://schema.org/EventScheduled",
    homeTeam: { "@type": "SportsTeam", name: h.name },
    awayTeam: { "@type": "SportsTeam", name: a.name },
    superEvent: { "@type": "SportsEvent", name: compName },
    url: `${siteUrl}${path.matchOf(m.id)}`,
    image: `${siteUrl}/og/${lang}/${m.id}`,
    ...(p ? { description: tm.ldDescription(h.name, a.name, `${p.score[0]}-${p.score[1]}`) } : {}),
    ...(m.venue ? { location: { "@type": "Place", name: m.venue } } : {}),
  };

  return (
    <article>
      <JsonLd
        data={[
          jsonLd,
          crumbs([
            ["Rinvalo", path.home],
            [compName, path.leagueOf(m.league)],
            [`${h.name} – ${a.name}`, path.matchOf(m.id)],
          ]),
        ]}
      />
      <div className="card match-hero reveal" style={heroStyle}>
        <div className="mh-top">
          <Link href={path.leagueOf(m.league)}>
            {compName} · {roundLabel(lang, m.league, m.round)}
          </Link>
          <span className="mh-meta">
            {f.longDay(m.kickoff)} · {f.time(m.kickoff)} {t.tzLabel}
            {m.venue ? ` · ${m.venue}` : ""}
            {!finished && <NotifyButton kind="match" id={m.id} lang={lang} />}
            <ShareButton title={tm.title(h.name, a.name)} lang={lang} />
          </span>
        </div>
        <div className="mh-teams">
          <Link href={path.teamOf(m.home)} className="mh-team" lang={langOf(m.home)}>
            <Crest slug={m.home} size="lg" />
            {h.name}
            {hi >= 0 && <small lang={lang}>{tm.position(hi + 1)}</small>}
          </Link>
          <div className="mh-center">
            {finished ? (
              <>
                <span className="mh-label">{tm.result}</span>
                <span className="mh-score">
                  {m.hg}-{m.ag}
                </span>
                {p && m.hit !== null && (
                  <>
                    <span className="mh-pick">{tm.ourPick(`${p.score[0]}-${p.score[1]}`)}</span>
                    <span className={`pill ${m.hit ? "good" : "bad"}`}>{m.exact ? tm.exact : m.hit ? tm.hit : tm.miss}</span>
                  </>
                )}
              </>
            ) : m.status === "postponed" ? (
              <>
                <span className="mh-label">{tm.postponed}</span>
                <span className="mh-score muted">–</span>
              </>
            ) : (
              <>
                <span className="mh-label">{withBrand(tm.prediction)}</span>
                <span className="mh-score">{p ? `${p.score[0]}-${p.score[1]}` : "–"}</span>
                <ConfidencePill level={p?.confidence} lang={lang} />
              </>
            )}
          </div>
          <Link href={path.teamOf(m.away)} className="mh-team" lang={langOf(m.away)}>
            <Crest slug={m.away} size="lg" />
            {a.name}
            {ai >= 0 && <small lang={lang}>{tm.position(ai + 1)}</small>}
          </Link>
        </div>
        {m.status === "scheduled" && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Countdown to={m.kickoff} lang={lang} />
          </div>
        )}
        {p && <ProbBar p={p.p} labels={[h.short, "X", a.short]} lang={lang} />}
      </div>

      <div className="match-grid">
        <div className="stack">
          {p && !finished && (
            <LiveMatch id={m.id} kickoff={m.kickoff} lh={p.lh} la={p.la} status={m.status} hg={m.hg} ag={m.ag} home={h.short} away={a.short} lang={lang} />
          )}
          {p ? (
            <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="section-title" style={{ margin: 0 }}>
                <h2>{tm.section}</h2>
                {finished && (
                  <span className="muted" style={{ fontSize: 13 }}>
                    {tm.predicted(`${p.score[0]}-${p.score[1]}`)}
                  </span>
                )}
              </div>
              {reasons && reasons.length > 0 && (
                <div className="why-box">
                  <ul>
                    {reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="kv-grid three">
                <div className="kv">
                  <small>{tm.xg}</small>
                  <b>
                    {f.dec(p.lh)} – {f.dec(p.la)}
                  </b>
                </div>
                <div className="kv">
                  <small>{tm.over25}</small>
                  <b>
                    <CountUp value={p.over25} lang={lang} />
                  </b>
                </div>
                <div className="kv">
                  <small>{tm.btts}</small>
                  <b>
                    <CountUp value={p.btts} lang={lang} />
                  </b>
                </div>
              </div>
              {(() => {
                const pick = pickOf(p.p);
                const winner = [h.name, null, a.name][pick];
                const differs = p.top[0][0] !== p.score[0] || p.top[0][1] !== p.score[1];
                const rows: [string, string, number | undefined, boolean][] = [
                  [tm.favResult, winner ? tm.winOf(winner) : tm.drawWord, p.p[pick], false],
                  [winner ? tm.ifWin(winner) : tm.ifDraw, `${p.score[0]}-${p.score[1]}`, p.grid[p.score[0]]?.[p.score[1]], true],
                ];
                if (differs) rows.push([tm.topScore, `${p.top[0][0]}-${p.top[0][1]}`, p.top[0][2], false]);
                return (
                  <>
                    <ul className="ladder">
                      {rows.map(([label, value, prob, ours]) => (
                        <li key={label} className={ours ? "ours" : undefined}>
                          <span>{label}</span>
                          <b>{value}</b>
                          <span className="num muted">{prob != null ? f.pct(prob, 1) : ""}</span>
                          {ours && <em>{tm.prediction}</em>}
                        </li>
                      ))}
                    </ul>
                    {differs && (
                      <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
                        {tm.whyDiffer}
                      </p>
                    )}
                  </>
                );
              })()}
            </section>
          ) : (
            <section className="card empty">
              <b>{tm.none}</b>
            </section>
          )}

          {cup && getSimulation().ties?.[m.id] && <TieOdds tie={getSimulation().ties![m.id]} lang={lang} />}
          {!cup && <Stakes stakes={stakesOf(getSimulation().impact?.[m.id], m.home, m.away)} league={leagueByCode(m.league)!} lang={lang} />}
          {getSquads()[m.id] && <Squads entry={getSquads()[m.id]} home={m.home} away={m.away} lang={lang} />}

          {p && (
            // The full numbers stay one tap away, so the pick and its reasons lead the page.
            <details className="card more-box">
              <summary>
                <span>{tm.more}</span>
                <small className="muted">{tm.moreHint}</small>
              </summary>
              <div className="more-body">
            {p && (p.market ?? getMarket()[m.id]) && (
              <MarketCompare rinvalo={p.p} market={(p.market ?? getMarket()[m.id])!} home={h.name} away={a.name} finished={finished} lang={lang} nameLang={nl} />
            )}
                <section className="more-sec">
                <ul className="scenarios" aria-label={tm.scenarios}>
                  {[
                    [h.name, liveOdds(p.lh, p.la, 1, 0, firstGoalMinute(p.lh, p.la))[0]],
                    [a.name, liveOdds(p.lh, p.la, 0, 1, firstGoalMinute(p.lh, p.la))[2]],
                  ].map(([n, v]) => (
                    <li key={n as string}>{tm.firstGoal(n as string, f.pct(v as number))}</li>
                  ))}
                  <li>{tm.goalless(f.pct(p.grid[0]?.[0] ?? Math.exp(-p.lh - p.la)))}</li>
                </ul>
                <FairOdds p={p} lang={lang} />
                <div>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>
                    {tm.grid}
                  </div>
                  <ScoreGrid grid={p.grid} home={h.name} away={a.name} actual={actual} lang={lang} />
                </div>
                </section>
              </div>
            </details>
          )}

          <section className="card card-pad">
            <div className="section-title">
              <h2>{tm.form}</h2>
              <Link href={`${path.compare}?a=${m.home}&b=${m.away}`}>{t.compare.cta} →</Link>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {[hi, ai].map((i, k) =>
                i >= 0 ? (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <Link href={path.teamOf(table[i].team)} className="tname">
                      <Crest slug={table[i].team} size="sm" />
                      {team(table[i].team, lang).name}
                    </Link>
                    <Form form={table[i].form} lang={lang} />
                  </div>
                ) : null,
              )}
            </div>
          </section>

          {h2h.length > 0 && (
            <section className="card card-pad">
              <div className="section-title">
                <h2>{tm.h2h}</h2>
              </div>
              <div className="mini-list">
                {h2h.map((x) => (
                  <div key={x.date + x.home} className="mini-item">
                    <TeamPair home={x.home} away={x.away} lang={lang} />
                    <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {f.fullDate(x.date)}
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
          <GuessWidget id={m.id} home={h.name} away={a.name} kickoff={m.kickoff} model={p ? p.score : null} actual={actual} lang={lang} />
          {table.some((r) => r.played > 0) && (
            <section className="card card-pad">
              <div className="section-title">
                <h2 style={{ fontSize: 16 }}>{tm.table}</h2>
                <Link href={path.leagueOf(m.league)}>{tm.fullTable}</Link>
              </div>
              <StandingsTable rows={table} zones={zonesOf(m.league)} highlight={[m.home, m.away]} only={near} compact lang={lang} />
            </section>
          )}
          {nextUp.length > 0 && (
            <section className="card card-pad">
              <div className="section-title">
                <h2 style={{ fontSize: 16 }}>{tm.others}</h2>
              </div>
              <div className="mini-list">
                {nextUp.slice(0, 9).map((x) => (
                  <Link key={x.id} href={path.matchOf(x.id)} className="mini-item">
                    <span className="mi-t" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Crest slug={x.home} size="sm" />
                      {team(x.home).short}
                      <span className="muted">–</span>
                      {team(x.away).short}
                      <Crest slug={x.away} size="sm" />
                    </span>
                    <b className="num" style={{ fontSize: 13 }}>
                      {x.status === "finished" ? `${x.hg}-${x.ag}` : x.prediction ? `${x.prediction.score[0]}-${x.prediction.score[1]}` : f.time(x.kickoff)}
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
