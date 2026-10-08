import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeagueMark } from "@/components/Crest";
import { CupOutlook } from "@/components/CupOutlook";
import { OutlookTable } from "@/components/OutlookTable";
import { RoundBrowser } from "@/components/RoundBrowser";
import { StandingsTable } from "@/components/StandingsTable";
import { Tabs } from "@/components/Tabs";
import { XgTable } from "@/components/XgTable";
import { accuracy, getRatings, getSimulation, leagueMatches, leagueTable } from "@/lib/data";
import { fmt } from "@/lib/format";
import { alternates, dict, roundLabel, type Lang } from "@/lib/i18n";
import { competitionName, countryOf, CUP_ROUNDS, cupByCode, CUPS, LEAGUES, leagueByCode, nameLang, SEASON, zonesOf, type Cup, type LeagueCode } from "@/lib/leagues";
import { lite } from "@/lib/picks";
import { leagueStats } from "@/lib/stats";

export function leagueParams() {
  return [...LEAGUES, ...CUPS].map((l) => ({ code: l.code }));
}

export function leagueMetadata(code: string, lang: Lang): Metadata {
  const t = dict(lang).league;
  if (!leagueByCode(code) && !cupByCode(code)) return {};
  const name = competitionName(code, lang);
  return { title: t.title(name), description: t.description(name), alternates: alternates(lang, "league", `/${code}`) };
}

/** Remaining opponents' average rating against the league average, per team (positive = harder run-in). */
function runIn(code: string): Map<string, number> | undefined {
  const ratings = new Map((getRatings().leagues[code] ?? []).map((r) => [r.team, r.elo]));
  if (!ratings.size) return undefined;
  const mean = [...ratings.values()].reduce((a, b) => a + b, 0) / ratings.size;
  const opp = new Map<string, number[]>();
  for (const m of leagueMatches(code).filter((x) => x.status !== "finished")) {
    opp.set(m.home, [...(opp.get(m.home) ?? []), ratings.get(m.away) ?? mean]);
    opp.set(m.away, [...(opp.get(m.away) ?? []), ratings.get(m.home) ?? mean]);
  }
  return new Map([...opp].map(([t, xs]) => [t, xs.reduce((a, b) => a + b, 0) / xs.length - mean]));
}

/** The round to open on: the next one with a game still to play. */
function currentRound(code: string, last: number) {
  const now = Date.now();
  const next = leagueMatches(code)
    .filter((m) => m.status !== "finished" && Date.parse(m.kickoff) > now - 3 * 3600_000)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0];
  return next?.round ?? last;
}

function CupPage({ cup, lang }: { cup: Cup; lang: Lang }) {
  const t = dict(lang).league;
  const matches = leagueMatches(cup.code);
  const rounds = CUP_ROUNDS.filter((r) => r <= 8 || matches.some((m) => m.round === r));
  const played = matches.filter((m) => m.status === "finished").length;
  const sim = getSimulation();
  // Only shown once every league-phase game is known (the free source misses some Conference League days).
  const odds = sim.cups?.[cup.code];
  return (
    <>
      <div className="page-head">
        <LeagueMark code={cup.code} accent={cup.accent} size={52} />
        <div>
          <h1 lang={lang}>{competitionName(cup.code, lang)}</h1>
          <p>
            UEFA · {SEASON} · {t.cupPlayed(played, matches.length)}
          </p>
        </div>
      </div>
      <Tabs
        tabs={[
          {
            id: "fikstur",
            label: t.cupFixtures,
            content: (
              <RoundBrowser
                matches={matches.map(lite)}
                rounds={rounds}
                labels={rounds.map((r) => roundLabel(lang, cup.code, r))}
                initial={currentRound(cup.code, rounds[rounds.length - 1])}
                lang={lang}
              />
            ),
          },
          ...(odds
            ? [
                {
                  id: "puan",
                  label: t.cupTable,
                  content: (
                    <div className="card card-pad">
                      <StandingsTable rows={leagueTable(cup.code)} zones={zonesOf(cup.code)} lang={lang} />
                      <p className="muted" style={{ fontSize: 12.5, margin: "10px 0 0" }}>
                        {t.cupZones}
                      </p>
                    </div>
                  ),
                },
                { id: "ihtimaller", label: t.cupOdds, content: <CupOutlook rows={odds} runs={sim.runs} lang={lang} /> },
              ]
            : []),
        ]}
      />
    </>
  );
}

export function League({ code: raw, lang }: { code: string; lang: Lang }) {
  const cup = cupByCode(raw);
  if (cup) return <CupPage cup={cup} lang={lang} />;
  const league = leagueByCode(raw);
  if (!league) notFound();
  const d = dict(lang);
  const t = d.league;
  const f = fmt(lang);
  const code = league.code as LeagueCode;
  const matches = leagueMatches(code);
  const table = leagueTable(code);
  const sim = getSimulation();
  const record = accuracy(matches);
  const played = matches.filter((m) => m.status === "finished").length;
  const rounds = Array.from({ length: league.rounds }, (_, i) => i + 1);

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
          {
            id: "fikstur",
            label: t.fixtures,
            content: <RoundBrowser matches={matches.map(lite)} rounds={rounds} labels={rounds.map(d.round)} initial={currentRound(code, league.rounds)} lang={lang} />,
          },
          {
            id: "puan",
            label: t.standings,
            content: (
              <div className="card card-pad">
                <StandingsTable rows={table} zones={league.zones} lang={lang} />
                <p className="muted" style={{ fontSize: 12.5, margin: "10px 0 0" }}>
                  {t.zones(league.zones.europe)}
                </p>
              </div>
            ),
          },
          {
            id: "ihtimaller",
            label: t.outlook,
            content: (
              <OutlookTable
                rows={sim.leagues[code] ?? []}
                league={league}
                runs={sim.runs}
                lang={lang}
                current={new Map(table.map((r, i) => [r.team, [i + 1, r.points] as [number, number]]))}
                schedule={runIn(code)}
              />
            ),
          },
          { id: "istatistik", label: t.stats, content: <XgTable rows={leagueStats(code)} lang={lang} /> },
        ]}
      />
    </>
  );
}
