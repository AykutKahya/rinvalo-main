import Link from "next/link";
import { fmt } from "@/lib/format";
import { dict, paths, type Lang } from "@/lib/i18n";
import type { TeamStats } from "@/lib/stats";
import { team } from "@/lib/teams";
import { Crest } from "./Crest";

const signed = (x: number, dec: (x: number, d?: number) => string) => (x > 0 ? `+${dec(x)}` : dec(x));

/** Teams whose points run furthest ahead of (or behind) what their chances were worth. */
function Luck({ rows, lang, title, tone }: { rows: TeamStats[]; lang: Lang; title: string; tone: "up" | "down" }) {
  const t = dict(lang).xg;
  const f = fmt(lang);
  const p = paths(lang);
  return (
    <section className="card card-pad luck">
      <h3>{title}</h3>
      <div className="mini-list">
        {rows.map((r) => (
          <Link key={r.team} href={p.teamOf(r.team)} className="mini-item">
            <span className="tname">
              <Crest slug={r.team} size="sm" />
              {team(r.team, lang).name}
            </span>
            <b className={`num ${tone}`}>{t.luckNote(signed(r.points - r.xpts, f.dec))}</b>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function XgTable({ rows, until, lang }: { rows: TeamStats[]; until?: string | null; lang: Lang }) {
  const t = dict(lang).xg;
  const f = fmt(lang);
  const p = paths(lang);
  if (!rows.length) return <div className="card empty">{t.none}</div>;
  const byLuck = [...rows].sort((a, b) => b.points - b.xpts - (a.points - a.xpts));
  return (
    <div className="stack">
      <div className="luck-grid">
        <Luck rows={byLuck.slice(0, 3)} lang={lang} title={t.lucky} tone="up" />
        <Luck rows={byLuck.slice(-3).reverse()} lang={lang} title={t.unlucky} tone="down" />
      </div>
      <div className="card card-pad">
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          {t.caption}
          {until && (
            <>
              <br />
              <small>{t.until(f.fullDate(`${until}T12:00:00Z`))}</small>
            </>
          )}
        </p>
        <div className="table-wrap">
          <table className="std">
            <thead>
              <tr>
                <th className="c">#</th>
                <th>{dict(lang).table.team}</th>
                <th className="c">{t.played}</th>
                <th className="c hide-sm">{t.goals}</th>
                <th className="c">{t.xg}</th>
                <th className="c">{t.xgd}</th>
                <th className="c">{t.pts}</th>
                <th className="c" title={t.xptsHint}>
                  {t.xpts}
                </th>
                <th className="c">{t.diff}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const d = r.points - r.xpts;
                return (
                  <tr key={r.team}>
                    <td className="c num">{i + 1}</td>
                    <td>
                      <Link href={p.teamOf(r.team)} className="tname">
                        <Crest slug={r.team} size="sm" />
                        {team(r.team, lang).name}
                      </Link>
                    </td>
                    <td className="c num">{r.played}</td>
                    <td className="c num hide-sm">
                      {r.gf}:{r.ga}
                    </td>
                    <td className="c num">
                      {f.dec(r.xgf)}:{f.dec(r.xga)}
                    </td>
                    <td className="c num">
                      <b>{signed(r.xgf - r.xga, f.dec)}</b>
                    </td>
                    <td className="c num">{r.points}</td>
                    <td className="c num muted">{f.dec(r.xpts)}</td>
                    <td className={`c num ${d >= 1.5 ? "up" : d <= -1.5 ? "down" : "muted"}`}>{signed(d, f.dec)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted table-note">{t.legend}</p>
      </div>
    </div>
  );
}
