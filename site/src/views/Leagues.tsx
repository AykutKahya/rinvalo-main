import type { Metadata } from "next";
import Link from "next/link";
import { Crest, LeagueMark } from "@/components/Crest";
import { getSimulation, leagueMatches, leagueTable, LEAGUES } from "@/lib/data";
import { fmt } from "@/lib/format";
import { alternates, dict, paths, type Lang } from "@/lib/i18n";
import { competitionName, countryOf, CUPS } from "@/lib/leagues";
import { team } from "@/lib/teams";

export function leaguesMetadata(lang: Lang): Metadata {
  return { title: dict(lang).leagues.title, alternates: alternates(lang, "leagues") };
}

export function Leagues({ lang }: { lang: Lang }) {
  const t = dict(lang).leagues;
  const f = fmt(lang);
  const p = paths(lang);
  const sim = getSimulation();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t.title}</h1>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))", gap: 16 }}>
        {LEAGUES.map((l) => {
          const table = leagueTable(l.code).slice(0, 5);
          const fav = (sim.leagues[l.code] ?? [])[0];
          const played = leagueMatches(l.code).filter((m) => m.status === "finished").length;
          return (
            <Link key={l.code} href={p.leagueOf(l.code)} className="card card-pad reveal" style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: `4px solid ${l.accent}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h2 style={{ fontSize: 19, display: "flex", alignItems: "center", gap: 10 }}>
                  <LeagueMark code={l.code} accent={l.accent} size={30} />
                  {l.name}
                </h2>
                <span className="muted" style={{ fontSize: 13 }}>
                  {countryOf(l, lang)} · {t.played(played)}
                </span>
              </div>
              <div className="mini-list">
                {table.map((r, i) => (
                  <div key={r.team} className="mini-item">
                    <span className="tname">
                      <span className="muted num" style={{ width: 16 }}>
                        {i + 1}
                      </span>
                      <Crest slug={r.team} size="sm" />
                      {team(r.team, lang).name}
                    </span>
                    <b className="num">{r.points}</b>
                  </div>
                ))}
              </div>
              {fav && (
                <div className="kv">
                  <small>{t.favourite}</small>
                  <b>
                    {team(fav.team, lang).name} {f.pct(fav.champion)}
                  </b>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <div className="section-title" style={{ marginTop: 28 }}>
        <h2>{dict(lang).league.europe}</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))", gap: 16 }}>
        {CUPS.map((c) => {
          // A partial league phase (missing source days) would mislead, so no table until it is complete.
          const table = sim.cups?.[c.code] ? leagueTable(c.code).slice(0, 5) : [];
          const played = leagueMatches(c.code).filter((m) => m.status === "finished").length;
          return (
            <Link key={c.code} href={p.leagueOf(c.code)} className="card card-pad reveal" style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: `4px solid ${c.accent}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h2 style={{ fontSize: 19, display: "flex", alignItems: "center", gap: 10 }}>
                  <LeagueMark code={c.code} accent={c.accent} size={30} />
                  {competitionName(c.code, lang)}
                </h2>
                <span className="muted" style={{ fontSize: 13 }}>
                  UEFA · {t.played(played)}
                </span>
              </div>
              <div className="mini-list">
                {table.map((r, i) => (
                  <div key={r.team} className="mini-item">
                    <span className="tname">
                      <span className="muted num" style={{ width: 16 }}>
                        {i + 1}
                      </span>
                      <Crest slug={r.team} size="sm" />
                      {team(r.team, lang).name}
                    </span>
                    <b className="num">{r.points}</b>
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="section-title" style={{ marginTop: 28 }}>
        <h2>{dict(lang).national.title}</h2>
      </div>
      <Link href={p.national} className="card card-pad reveal nat-card">
        <b>{dict(lang).national.nationsLeague}</b>
        <span className="muted">{dict(lang).national.card}</span>
      </Link>
    </>
  );
}
