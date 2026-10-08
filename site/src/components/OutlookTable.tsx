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

export function OutlookTable({ rows, league, runs, lang }: { rows: TeamOutlook[]; league: League; runs: number; lang: Lang }) {
  const t = dict(lang).outlook;
  const f = fmt(lang);
  const p = paths(lang);
  return (
    <div className="card card-pad">
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        {t.runs(f.int(runs))}
      </p>
      <div className="table-wrap">
        <table className="std">
          <thead>
            <tr>
              <th>{dict(lang).table.team}</th>
              <th className="c">{t.avg}</th>
              <th>{t.champion}</th>
              <th>{t.top(league.zones.europe)}</th>
              <th>{t.relegation}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.team}>
                <td>
                  <Link href={p.teamOf(r.team)} className="tname">
                    <Crest slug={r.team} size="sm" />
                    {team(r.team, lang).name}
                  </Link>
                </td>
                <td className="c num">{r.avgPoints.toFixed(0)}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
