import Link from "next/link";
import { fmt } from "@/lib/format";
import { dict, paths, type Lang } from "@/lib/i18n";
import type { League } from "@/lib/leagues";
import { team } from "@/lib/teams";
import type { TeamOutlook } from "@/lib/types";
import { Crest } from "./Crest";

function Bar({ v, color, lang }: { v: number; color: string; lang: Lang }) {
  const { pct } = fmt(lang);
  return (
    <span className="odds-bar" style={{ ["--bar" as string]: color }}>
      <span style={{ width: `${v > 0 ? Math.max(v * 100, 1.5) : 0}%`, borderRightWidth: v > 0 ? 3 : 0 }} />
      <em>{v >= 0.995 ? pct(1) : v > 0 && v < 0.005 ? `<${pct(0.01)}` : pct(v)}</em>
    </span>
  );
}

/** Expected final table: simulated average points next to the current table, with title/top/relegation odds. */
export function OutlookTable({
  rows,
  league,
  runs,
  lang,
  current,
}: {
  rows: TeamOutlook[];
  league: League;
  runs: number;
  lang: Lang;
  /** Team → [current position (1-based), current points]. */
  current: Map<string, [number, number]>;
}) {
  const d = dict(lang);
  const t = d.outlook;
  const f = fmt(lang);
  const p = paths(lang);
  const sorted = [...rows].sort((a, b) => b.avgPoints - a.avgPoints || a.avgPosition - b.avgPosition);
  const n = sorted.length;
  return (
    <div className="card card-pad">
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        {d.seasonEnd.caption(f.int(runs))}
      </p>
      <div className="table-wrap">
        <table className="std">
          <thead>
            <tr>
              <th className="c">#</th>
              <th>{d.table.team}</th>
              <th className="c">{d.seasonEnd.now}</th>
              <th className="c">{d.seasonEnd.projected}</th>
              <th>{t.champion}</th>
              <th>{t.top(league.zones.europe)}</th>
              <th>{t.relegation}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const [pos, pts] = current.get(r.team) ?? [0, 0];
              const move = pos ? pos - (i + 1) : 0;
              return (
                <tr key={r.team}>
                  <td className="c">
                    <span className={`pos${i < league.zones.europe ? " eu" : i >= n - league.zones.relegation ? " rel" : ""}`}>{i + 1}</span>
                    {move !== 0 && <span className={`move ${move > 0 ? "up" : "down"}`}>{move > 0 ? `▲${move}` : `▼${-move}`}</span>}
                  </td>
                  <td>
                    <Link href={p.teamOf(r.team)} className="tname">
                      <Crest slug={r.team} size="sm" />
                      {team(r.team, lang).name}
                    </Link>
                  </td>
                  <td className="c num muted">{pts}</td>
                  <td className="c num">
                    <b>{r.avgPoints.toFixed(0)}</b>
                  </td>
                  <td style={{ minWidth: 110 }}>
                    <Bar v={r.champion} color="var(--warn)" lang={lang} />
                  </td>
                  <td style={{ minWidth: 110 }}>
                    <Bar v={r.europe} color="var(--eu)" lang={lang} />
                  </td>
                  <td style={{ minWidth: 110 }}>
                    <Bar v={r.relegation} color="var(--bad)" lang={lang} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
