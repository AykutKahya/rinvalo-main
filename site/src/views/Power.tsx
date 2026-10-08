import type { Metadata } from "next";
import Link from "next/link";
import { Crest } from "@/components/Crest";
import { Tabs } from "@/components/Tabs";
import { getRatings, LEAGUES, type TeamRating } from "@/lib/data";
import { fmt } from "@/lib/format";
import { alternates, dict, paths, type Lang } from "@/lib/i18n";
import { team } from "@/lib/teams";

export function powerMetadata(lang: Lang): Metadata {
  const t = dict(lang).power;
  return { title: t.title, description: t.description, alternates: alternates(lang, "power") };
}

function Move({ d }: { d: number }) {
  if (!d) return <span className="muted">–</span>;
  return <span className={d > 0 ? "move up" : "move down"}>{d > 0 ? `▲${d}` : `▼${-d}`}</span>;
}

function Table({ rows, lang }: { rows: TeamRating[]; lang: Lang }) {
  const t = dict(lang).power;
  const f = fmt(lang);
  const p = paths(lang);
  const before = [...rows].sort((a, b) => b.elo - b.last - (a.elo - a.last)).map((r) => r.team);
  const hi = rows[0]?.elo ?? 1500;
  const lo = rows[rows.length - 1]?.elo ?? 1500;
  return (
    <div className="card table-wrap">
      <table className="std power">
        <thead>
          <tr>
            <th className="c">#</th>
            <th>{dict(lang).table.team}</th>
            <th>{t.rating}</th>
            <th className="c">{t.last}</th>
            <th className="c" title={t.attackHint}>
              {t.attack}
            </th>
            <th className="c" title={t.defenceHint}>
              {t.defence}
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
                  <Link href={p.teamOf(r.team)} className="tname">
                    <Crest slug={r.team} size="sm" />
                    {team(r.team, lang).name}
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
                <td className="c num">{f.dec(r.gf, 2)}</td>
                <td className="c num">{f.dec(r.ga, 2)}</td>
                <td className="c num muted hide-sm">{f.dec(r.xgf, 2)}</td>
                <td className="c num muted hide-sm">{f.dec(r.xga, 2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Power({ lang }: { lang: Lang }) {
  const { leagues } = getRatings();
  const d = dict(lang);
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">{d.analysis.eyebrow}</span>
          <h1>{d.power.title}</h1>
        </div>
      </div>
      <Tabs
        tabs={LEAGUES.filter((l) => leagues[l.code]?.length).map((l) => ({
          id: l.code,
          label: l.name,
          content: <Table rows={leagues[l.code]} lang={lang} />,
        }))}
      />
    </>
  );
}
