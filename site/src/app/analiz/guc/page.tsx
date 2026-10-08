import type { Metadata } from "next";
import Link from "next/link";
import { Crest } from "@/components/Crest";
import { Tabs } from "@/components/Tabs";
import { getRatings, LEAGUES, type TeamRating } from "@/lib/data";
import { team } from "@/lib/teams";

export const metadata: Metadata = {
  title: "Güç sıralaması",
  description: "Süper Lig ve Avrupa liglerinde takımların güncel güç puanı, hücum ve savunma değerleri.",
};

const dec = (x: number) => x.toFixed(2).replace(".", ",");

function Move({ d }: { d: number }) {
  if (!d) return <span className="muted">–</span>;
  return <span className={d > 0 ? "move up" : "move down"}>{d > 0 ? `▲${d}` : `▼${-d}`}</span>;
}

function Table({ rows }: { rows: TeamRating[] }) {
  const before = [...rows].sort((a, b) => b.elo - b.last - (a.elo - a.last)).map((r) => r.team);
  const hi = rows[0]?.elo ?? 1500;
  const lo = rows[rows.length - 1]?.elo ?? 1500;
  return (
    <div className="card table-wrap">
      <table className="std power">
        <thead>
          <tr>
            <th className="c">#</th>
            <th>Takım</th>
            <th>Güç puanı</th>
            <th className="c">Son maç</th>
            <th className="c" title="Ortalama rakibe karşı maç başı beklenen gol">
              Hücum
            </th>
            <th className="c" title="Ortalama rakibe karşı maç başı beklenen yenilen gol">
              Savunma
            </th>
            <th className="c hide-sm">xG +</th>
            <th className="c hide-sm">xG −</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const d = Math.round(r.last);
            const was = before.indexOf(r.team);
            return (
              <tr key={r.team}>
                <td className="c num">
                  <b>{i + 1}</b> <Move d={was - i} />
                </td>
                <td>
                  <Link href={`/takim/${r.team}`} className="tname">
                    <Crest slug={r.team} size="sm" />
                    {team(r.team).name}
                  </Link>
                </td>
                <td>
                  <span className="power-cell">
                    <b className="num">{Math.round(r.elo)}</b>
                    <span className="power-bar" aria-hidden="true">
                      <i style={{ width: `${12 + (88 * (r.elo - lo)) / Math.max(hi - lo, 1)}%` }} />
                    </span>
                  </span>
                </td>
                <td className={`c num ${d > 0 ? "up" : d < 0 ? "down" : "muted"}`}>{d > 0 ? `+${d}` : d < 0 ? d : "0"}</td>
                <td className="c num">{dec(r.gf)}</td>
                <td className="c num">{dec(r.ga)}</td>
                <td className="c num muted hide-sm">{dec(r.xgf)}</td>
                <td className="c num muted hide-sm">{dec(r.xga)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function PowerPage() {
  const { leagues } = getRatings();
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Analiz</span>
          <h1>Güç sıralaması</h1>
        </div>
      </div>
      <Tabs
        tabs={LEAGUES.filter((l) => leagues[l.code]?.length).map((l) => ({
          id: l.code,
          label: l.name,
          content: <Table rows={leagues[l.code]} />,
        }))}
      />
    </>
  );
}
