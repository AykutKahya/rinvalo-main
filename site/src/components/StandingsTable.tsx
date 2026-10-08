import Link from "next/link";
import type { League } from "@/lib/leagues";
import type { TableRow } from "@/lib/table";
import { team } from "@/lib/teams";
import { Crest } from "./Crest";

export function Form({ form }: { form: TableRow["form"] }) {
  return (
    <span className="form" aria-label={`Son maçlar: ${form.join(" ")}`}>
      {form.map((f, i) => (
        <i key={i} className={f}>
          {f}
        </i>
      ))}
    </span>
  );
}

/** Full or partial standings. `only` limits rows to the given positions (0-based). */
export function StandingsTable({ rows, league, highlight = [], only, compact = false }: { rows: TableRow[]; league: League; highlight?: string[]; only?: number[]; compact?: boolean }) {
  const n = rows.length;
  return (
    <div className="table-wrap">
      <table className="std">
        <thead>
          <tr>
            <th className="c">#</th>
            <th>Takım</th>
            <th className="c">O</th>
            {!compact && (
              <>
                <th className="c">G</th>
                <th className="c">B</th>
                <th className="c">M</th>
                <th className="c">A:Y</th>
              </>
            )}
            <th className="c">Av</th>
            <th className="c">P</th>
            {!compact && <th>Form</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) =>
            only && !only.includes(i) ? null : (
              <tr key={r.team} className={highlight.includes(r.team) ? "hl" : undefined}>
                <td className="c">
                  <span className={`pos${i < league.zones.europe ? " eu" : i >= n - league.zones.relegation ? " rel" : ""}`}>{i + 1}</span>
                </td>
                <td>
                  <Link href={`/takim/${r.team}`} className="tname">
                    <Crest slug={r.team} size="sm" />
                    {team(r.team).name}
                  </Link>
                </td>
                <td className="c">{r.played}</td>
                {!compact && (
                  <>
                    <td className="c">{r.won}</td>
                    <td className="c">{r.drawn}</td>
                    <td className="c">{r.lost}</td>
                    <td className="c">
                      {r.gf}:{r.ga}
                    </td>
                  </>
                )}
                <td className="c">{r.gf - r.ga > 0 ? `+${r.gf - r.ga}` : r.gf - r.ga}</td>
                <td className="c">
                  <b>{r.points}</b>
                </td>
                {!compact && (
                  <td>
                    <Form form={r.form} />
                  </td>
                )}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
