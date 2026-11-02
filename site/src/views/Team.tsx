import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { CalendarButton } from "@/components/CalendarButton";
import { CountUp } from "@/components/CountUp";
import { SeasonChart } from "@/components/SeasonChart";
import { Crest } from "@/components/Crest";
import { NotifyButton } from "@/components/NotifyButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { MatchRow } from "@/components/MatchRow";
import { ProbBar } from "@/components/ProbBar";
import { Form } from "@/components/StandingsTable";
import { accuracy, getMatches, getSimulation, leagueTable, seasonTeams } from "@/lib/data";
import { fmt } from "@/lib/format";
import { alternates, dict, paths, type Lang } from "@/lib/i18n";
import { competitionName, leagueByCode, nameLang } from "@/lib/leagues";
import { teamSeries } from "@/lib/series";
import { team } from "@/lib/teams";

/** Club pages render on first visit and stay cached until the next deploy; building them ahead added minutes to every deploy. */
export function teamParams() {
  return [] as { slug: string }[];
}

export function teamMetadata(slug: string, lang: Lang): Metadata {
  const n = team(slug, lang).name;
  const t = dict(lang).team;
  return { title: t.title(n), description: t.description(n), alternates: alternates(lang, "team", `/${slug}`) };
}

export function Team({ slug, lang }: { slug: string; lang: Lang }) {
  const entry = seasonTeams().find((t) => t.slug === slug);
  if (!entry) notFound();
  const f = fmt(lang);
  const d = dict(lang);
  const tt = d.team;
  const path = paths(lang);
  const t = team(slug, lang);
  // Undefined for clubs we only see in a European cup.
  const league = leagueByCode(entry.league);
  const matches = getMatches().filter((m) => m.home === slug || m.away === slug);
  const table = leagueTable(entry.league);
  const pos = table.findIndex((r) => r.team === slug);
  const row = table[pos];
  const outlook = getSimulation().leagues[entry.league]?.find((r) => r.team === slug);
  const now = Date.now();
  const next = matches.find((m) => m.status === "scheduled" && Date.parse(m.kickoff) > now);
  const played = matches.filter((m) => m.status === "finished").reverse();
  const upcoming = matches.filter((m) => m.status !== "finished" && m.id !== next?.id).slice(0, 6);
  const record = accuracy(matches);

  return (
    <>
      <div className="card team-head reveal" style={{ "--c1": t.colors[0], "--c2": t.colors[1] } as CSSProperties}>
        <Crest slug={slug} size="lg" />
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: "clamp(24px,4vw,32px)", fontWeight: 800 }} lang={nameLang(entry.league)}>
            {t.name}
          </h1>
          <p className="muted" style={{ margin: "2px 0 8px" }}>
            <Link href={path.leagueOf(entry.league)}>{competitionName(entry.league, lang)}</Link>
            {row ? tt.standing(pos + 1, row.points) : ""}
          </p>
          {row && <Form form={row.form} lang={lang} />}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <FavoriteButton slug={slug} name={t.name} lang={lang} />
          <NotifyButton kind="team" id={slug} lang={lang} look="button" />
          <CalendarButton slug={slug} lang={lang} />
          {league && (
            <Link href={`${path.compare}?a=${slug}`} className="btn ghost">
              {d.compare.cta}
            </Link>
          )}
        </div>
      </div>

      {league && (
        <div className="stat-row" style={{ marginTop: 16 }}>
          <div className="card stat">
            <b>{outlook ? <CountUp value={outlook.champion} lang={lang} /> : "–"}</b>
            <span>{tt.champion}</span>
          </div>
          <div className="card stat">
            <b>{outlook ? <CountUp value={outlook.europe} lang={lang} /> : "–"}</b>
            <span>{tt.top(league.zones.europe)}</span>
          </div>
          <div className="card stat">
            <b>{outlook ? <CountUp value={outlook.relegation} lang={lang} /> : "–"}</b>
            <span>{tt.relegation}</span>
          </div>
          <div className="card stat">
            <b>{outlook ? <CountUp value={Math.round(outlook.avgPoints)} kind="int" lang={lang} /> : "–"}</b>
            <span>{tt.points}</span>
          </div>
        </div>
      )}

      <div className="match-grid">
        <div className="stack">
          {league && <SeasonChart series={teamSeries(slug, entry.league)} lang={lang} />}
          {upcoming.length > 0 && (
            <section className="card group" style={{ margin: 0 }}>
              <div className="group-head">
                <span>{tt.upcoming}</span>
                <span>{d.colsPick}</span>
              </div>
              {upcoming.map((m) => (
                <MatchRow key={m.id} m={m} showDate lang={lang} />
              ))}
            </section>
          )}
          <section className="card group" style={{ margin: 0 }}>
            <div className="group-head">
              <span>{tt.played}</span>
              <span>{record.n > 0 ? tt.hits(record.hits, record.n) : ""}</span>
            </div>
            {played.length ? played.map((m) => <MatchRow key={m.id} m={m} showDate lang={lang} />) : <div className="empty">{tt.none}</div>}
          </section>
        </div>
        <aside className="stack">
          {next && next.prediction && (
            <Link href={path.matchOf(next.id)} className="card feature">
              <div className="section-title" style={{ margin: 0 }}>
                <span className="eyebrow">{tt.next}</span>
                <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {f.longDay(next.kickoff)} {f.time(next.kickoff)}
                </span>
              </div>
              <div className="vs">
                <span>
                  <Crest slug={next.home} size="md" />
                  <br />
                  {team(next.home, lang).name}
                </span>
                <span className="big">
                  {next.prediction.score[0]}-{next.prediction.score[1]}
                </span>
                <span>
                  <Crest slug={next.away} size="md" />
                  <br />
                  {team(next.away, lang).name}
                </span>
              </div>
              <ProbBar p={next.prediction.p} lang={lang} />
              <span className="btn">{tt.go}</span>
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
