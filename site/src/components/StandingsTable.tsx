import Link from "next/link";
import { dict, paths, type Lang } from "@/lib/i18n";
import type { TableRow } from "@/lib/table";
import { team } from "@/lib/teams";
import { Crest } from "./Crest";

export function Form({ form, lang }: { form: TableRow["form"]; lang: Lang }) {
  const t = dict(lang).form;
  const letters = form.map((f) => t[f]);
  return (
    <span className="form" aria-label={`${t.label}: ${letters.join(" ")}`}>
      {form.map((f, i) => (
        <i key={i} className={f}>
          {letters[i]}
        </i>
      ))}
    </span>
  );
}

/** Full or partial standings. `only` limits rows to the given positions (0-based). */
export function StandingsTable({
  rows,
  zones,
  lang,
  highlight = [],
  only,
  compact = false,
}: {
  rows: TableRow[];
  /** Coloured places at the top (Europe, promotion, cup knockout) and bottom (relegation, out). */
  zones: { europe: number; relegation: number };
  lang: Lang;
  highlight?: string[];
  only?: number[];
  compact?: boolean;
}) {
  const n = rows.length;
  const t = dict(lang).table;
  const p = paths(lang);
  return (
    <div className="table-wrap">
      <table className="std">
        <thead>
          <tr>
            <th className="c">#</th>
            <th>{t.team}</th>
            <th className="c">{t.p}</th>
            {!compact && (
              <>
                <th className="c">{t.w}</th>
                <th className="c">{t.d}</th>
                <th className="c">{t.l}</th>
                <th className="c">{t.gfga}</th>
              </>
            )}
            <th className="c">{t.gd}</th>
            <th className="c">{t.pts}</th>
            {!compact && <th>{t.form}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) =>
            only && !only.includes(i) ? null : (
              <tr key={r.team} className={highlight.includes(r.team) ? "hl" : undefined}>
                <td className="c">
                  <span className={`pos${i < zones.europe ? " eu" : i >= n - zones.relegation ? " rel" : ""}`}>{i + 1}</span>
                </td>
                <td>
                  <Link href={p.teamOf(r.team)} className="tname">
                    <Crest slug={r.team} size="sm" />
                    {team(r.team, lang).name}
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
                    <Form form={r.form} lang={lang} />
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
