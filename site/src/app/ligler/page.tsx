import type { Metadata } from "next";
import Link from "next/link";
import { Crest, LeagueMark } from "@/components/Crest";
import { getSimulation, leagueMatches, leagueTable, LEAGUES } from "@/lib/data";
import { pct } from "@/lib/format";
import { team } from "@/lib/teams";

export const metadata: Metadata = { title: "Ligler" };

export default function LeaguesPage() {
  const sim = getSimulation();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ligler</h1>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))", gap: 16 }}>
        {LEAGUES.map((l) => {
          const table = leagueTable(l.code).slice(0, 5);
          const fav = (sim.leagues[l.code] ?? [])[0];
          const played = leagueMatches(l.code).filter((m) => m.status === "finished").length;
          return (
            <Link key={l.code} href={`/lig/${l.code}`} className="card card-pad reveal" style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: `4px solid ${l.accent}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h2 style={{ fontSize: 19, display: "flex", alignItems: "center", gap: 10 }}>
                  <LeagueMark code={l.code} accent={l.accent} size={30} />
                  {l.name}
                </h2>
                <span className="muted" style={{ fontSize: 13 }}>
                  {l.country} · {played} maç oynandı
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
                      {team(r.team).name}
                    </span>
                    <b className="num">{r.points}</b>
                  </div>
                ))}
              </div>
              {fav && (
                <div className="kv">
                  <small>Modelin şampiyon adayı</small>
                  <b>
                    {team(fav.team).name} {pct(fav.champion)}
                  </b>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}
