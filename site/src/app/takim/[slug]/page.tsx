import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { CountUp } from "@/components/CountUp";
import { Crest } from "@/components/Crest";
import { FavoriteButton } from "@/components/FavoriteButton";
import { MatchRow } from "@/components/MatchRow";
import { ProbBar } from "@/components/ProbBar";
import { Form } from "@/components/StandingsTable";
import { accuracy, getMatches, getSimulation, leagueTable, seasonTeams } from "@/lib/data";
import { longDay, pct, time } from "@/lib/format";
import { leagueByCode } from "@/lib/leagues";
import { team } from "@/lib/teams";

export function generateStaticParams() {
  return seasonTeams().map((t) => ({ slug: t.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/takim/[slug]">): Promise<Metadata> {
  const t = team((await params).slug);
  return { title: `${t.name} maç tahminleri`, description: `${t.name} fikstürü, sonuçları, formu ve sonraki maç tahmini.` };
}

export default async function TeamPage({ params }: PageProps<"/takim/[slug]">) {
  const { slug } = await params;
  const entry = seasonTeams().find((t) => t.slug === slug);
  if (!entry) notFound();
  const t = team(slug);
  const league = leagueByCode(entry.league)!;
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
          <h1 style={{ fontSize: "clamp(24px,4vw,32px)", fontWeight: 800 }}>{t.name}</h1>
          <p className="muted" style={{ margin: "2px 0 8px" }}>
            <Link href={`/lig/${league.code}`}>{league.name}</Link>
            {row ? ` · ${pos + 1}. sıra · ${row.points} puan` : ""}
          </p>
          {row && <Form form={row.form} />}
        </div>
        <FavoriteButton slug={slug} name={t.name} />
      </div>

      <div className="stat-row" style={{ marginTop: 16 }}>
        <div className="card stat">
          <b>{outlook ? <CountUp value={outlook.champion} /> : "–"}</b>
          <span>Şampiyonluk ihtimali</span>
        </div>
        <div className="card stat">
          <b>{outlook ? <CountUp value={outlook.europe} /> : "–"}</b>
          <span>İlk {league.zones.europe} ihtimali</span>
        </div>
        <div className="card stat">
          <b>{outlook ? <CountUp value={outlook.relegation} /> : "–"}</b>
          <span>Küme düşme ihtimali</span>
        </div>
        <div className="card stat">
          <b>{outlook ? <CountUp value={Math.round(outlook.avgPoints)} kind="int" /> : "–"}</b>
          <span>Beklenen sezon sonu puanı</span>
        </div>
      </div>

      <div className="match-grid">
        <div className="stack">
          {upcoming.length > 0 && (
            <section className="card group" style={{ margin: 0 }}>
              <div className="group-head">
                <span>Sıradaki maçlar</span>
                <span>1 · X · 2 &nbsp; Skor</span>
              </div>
              {upcoming.map((m) => (
                <MatchRow key={m.id} m={m} showDate />
              ))}
            </section>
          )}
          <section className="card group" style={{ margin: 0 }}>
            <div className="group-head">
              <span>Oynanan maçlar</span>
              <span>{record.n > 0 ? `Tahmin isabeti ${record.hits}/${record.n}` : ""}</span>
            </div>
            {played.length ? played.map((m) => <MatchRow key={m.id} m={m} showDate />) : <div className="empty">Henüz oynanmış maç yok.</div>}
          </section>
        </div>
        <aside className="stack">
          {next && next.prediction && (
            <Link href={`/mac/${next.id}`} className="card feature">
              <div className="section-title" style={{ margin: 0 }}>
                <span className="eyebrow">Sonraki maç</span>
                <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {longDay(next.kickoff)} {time(next.kickoff)}
                </span>
              </div>
              <div className="vs">
                <span>
                  <Crest slug={next.home} size="md" />
                  <br />
                  {team(next.home).name}
                </span>
                <span className="big">
                  {next.prediction.score[0]}-{next.prediction.score[1]}
                </span>
                <span>
                  <Crest slug={next.away} size="md" />
                  <br />
                  {team(next.away).name}
                </span>
              </div>
              <ProbBar p={next.prediction.p} />
              <span className="btn">Maça git →</span>
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
