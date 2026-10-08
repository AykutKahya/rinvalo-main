import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeagueMark } from "@/components/Crest";
import { OutlookTable } from "@/components/OutlookTable";
import { RoundBrowser } from "@/components/RoundBrowser";
import { StandingsTable } from "@/components/StandingsTable";
import { Tabs } from "@/components/Tabs";
import { XgTable } from "@/components/XgTable";
import { accuracy, getSimulation, leagueMatches, leagueTable } from "@/lib/data";
import { fmt } from "@/lib/format";
import { alternates, dict, type Lang } from "@/lib/i18n";
import { countryOf, LEAGUES, leagueByCode, nameLang, SEASON, type LeagueCode } from "@/lib/leagues";
import { lite } from "@/lib/picks";
import { leagueStats } from "@/lib/stats";

export function leagueParams() {
  return LEAGUES.map((l) => ({ code: l.code }));
}

export function leagueMetadata(code: string, lang: Lang): Metadata {
  const l = leagueByCode(code);
  const t = dict(lang).league;
  return l ? { title: t.title(l.name), description: t.description(l.name), alternates: alternates(lang, "league", `/${code}`) } : {};
}

export function League({ code: raw, lang }: { code: string; lang: Lang }) {
  const league = leagueByCode(raw);
  if (!league) notFound();
  const t = dict(lang).league;
  const f = fmt(lang);
  const code = league.code as LeagueCode;
  const matches = leagueMatches(code);
  const table = leagueTable(code);
  const sim = getSimulation();
  const now = Date.now();
  const next = matches.filter((m) => m.status !== "finished" && Date.parse(m.kickoff) > now - 3 * 3600_000).sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0];
  const currentRound = next?.round ?? league.rounds;
  const record = accuracy(matches);
  const played = matches.filter((m) => m.status === "finished").length;

  return (
    <>
      <div className="page-head">
        <LeagueMark code={league.code} accent={league.accent} size={52} />
        <div>
          <h1 lang={nameLang(league.code)}>{league.name}</h1>
          <p>
            {countryOf(league, lang)} · {SEASON} · {t.played(played, matches.length)}
            {record.n > 0 ? t.seasonHits(f.pct(record.hits / record.n), record.n) : ""}
          </p>
        </div>
      </div>
      <Tabs
        tabs={[
          { id: "fikstur", label: t.fixtures, content: <RoundBrowser matches={matches.map(lite)} rounds={league.rounds} initial={currentRound} lang={lang} /> },
          {
            id: "puan",
            label: t.standings,
            content: (
              <div className="card card-pad">
                <StandingsTable rows={table} league={league} lang={lang} />
                <p className="muted" style={{ fontSize: 12.5, margin: "10px 0 0" }}>
                  {t.zones(league.zones.europe)}
                </p>
              </div>
            ),
          },
          {
            id: "ihtimaller",
            label: t.outlook,
            content: <OutlookTable rows={sim.leagues[code] ?? []} league={league} runs={sim.runs} lang={lang} current={new Map(table.map((r, i) => [r.team, [i + 1, r.points] as [number, number]]))} />,
          },
          { id: "istatistik", label: t.stats, content: <XgTable rows={leagueStats(code)} lang={lang} /> },
        ]}
      />
    </>
  );
}
