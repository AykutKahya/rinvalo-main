import Link from "next/link";
import { pct } from "@/lib/format";
import type { League } from "@/lib/leagues";
import { team } from "@/lib/teams";
import type { TeamOutlook } from "@/lib/types";
import { Crest } from "./Crest";

function Bar({ v, color }: { v: number; color: string }) {
  return (
    <span className="odds-bar" style={{ ["--bar" as string]: color }}>
      <span style={{ width: `${v > 0 ? Math.max(v * 100, 1.5) : 0}%`, borderRightWidth: v > 0 ? 3 : 0 }} />
      <em>{v >= 0.995 ? "%100" : v > 0 && v < 0.005 ? "<%1" : pct(v)}</em>
    </span>
  );
}

export function OutlookTable({ rows, league, runs }: { rows: TeamOutlook[]; league: League; runs: number }) {
  return (
    <div className="card card-pad">
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>{runs.toLocaleString("tr-TR")} sezon simülasyonu</p>
      <div className="table-wrap">
        <table className="std">
          <thead>
            <tr>
              <th>Takım</th>
              <th className="c">Ort. puan</th>
              <th>Şampiyonluk</th>
              <th>İlk {league.zones.europe}</th>
              <th>Küme düşme</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.team}>
                <td>
                  <Link href={`/takim/${r.team}`} className="tname">
                    <Crest slug={r.team} size="sm" />
                    {team(r.team).name}
                  </Link>
                </td>
                <td className="c num">{r.avgPoints.toFixed(0)}</td>
                <td style={{ minWidth: 110 }}>
                  <Bar v={r.champion} color="var(--warn)" />
                </td>
                <td style={{ minWidth: 110 }}>
                  <Bar v={r.europe} color="var(--eu)" />
                </td>
                <td style={{ minWidth: 110 }}>
                  <Bar v={r.relegation} color="var(--bad)" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
