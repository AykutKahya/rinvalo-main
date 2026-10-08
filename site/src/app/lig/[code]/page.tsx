import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeagueMark } from "@/components/Crest";
import { OutlookTable } from "@/components/OutlookTable";
import { RoundBrowser } from "@/components/RoundBrowser";
import { StandingsTable } from "@/components/StandingsTable";
import { Tabs } from "@/components/Tabs";
import { accuracy, getSimulation, leagueMatches, leagueTable } from "@/lib/data";
import { pct } from "@/lib/format";
import { LEAGUES, leagueByCode, type LeagueCode } from "@/lib/leagues";
import { lite } from "@/lib/picks";

export function generateStaticParams() {
  return LEAGUES.map((l) => ({ code: l.code }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/lig/[code]">): Promise<Metadata> {
  const l = leagueByCode((await params).code);
  return l ? { title: `${l.name} tahminleri ve puan durumu`, description: `${l.name} maç tahminleri, puan durumu ve şampiyonluk ihtimalleri.` } : {};
}

export default async function LeaguePage({ params }: PageProps<"/lig/[code]">) {
  const league = leagueByCode((await params).code);
  if (!league) notFound();
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
          <h1 lang={league.code === "super-lig" ? "tr" : "en"}>{league.name}</h1>
          <p>
            {league.country} · 2026-27 · {played}/{matches.length} maç oynandı
            {record.n > 0 ? ` · bu sezon tahmin isabeti ${pct(record.hits / record.n)} (${record.n} maç)` : ""}
          </p>
        </div>
      </div>
      <Tabs
        tabs={[
          { id: "fikstur", label: "Fikstür ve tahminler", content: <RoundBrowser matches={matches.map(lite)} rounds={league.rounds} initial={currentRound} /> },
          {
            id: "puan",
            label: "Puan durumu",
            content: (
              <div className="card card-pad">
                <StandingsTable rows={table} league={league} />
                <p className="muted" style={{ fontSize: 12.5, margin: "10px 0 0" }}>
                  Mavi: ilk {league.zones.europe} · Kırmızı: küme düşme hattı
                </p>
              </div>
            ),
          },
          { id: "ihtimaller", label: "Şampiyonluk ihtimalleri", content: <OutlookTable rows={sim.leagues[code] ?? []} league={league} runs={sim.runs} /> },
        ]}
      />
    </>
  );
}
