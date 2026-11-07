import { fmt } from "@/lib/format";
import { dict, type Lang } from "@/lib/i18n";
import type { MatchStats } from "@/lib/stats";

/** After the final whistle: the goals expected before kick-off next to what the game produced. */
export function MatchStatsCard({ stats, expected, lang }: { stats: MatchStats; expected: [number, number] | null; lang: Lang }) {
  const t = dict(lang).match;
  const f = fmt(lang);
  const rows: [string, [number, number] | null, boolean][] = [
    [t.statsExpected, expected, true],
    [t.statsXg, stats.xg, true],
    [t.statsShots, stats.shots, false],
    [t.statsOnTarget, stats.onTarget, false],
    [t.statsCorners, stats.corners, false],
    [t.statsYellow, stats.yellow, false],
    [t.statsRed, stats.red, false],
  ];
  const shown = rows.filter(([, v]) => v);
  if (shown.length < 2) return null;
  return (
    <section id="istatistik" className="card card-pad">
      <div className="section-title" style={{ margin: 0 }}>
        <h2>{t.statsTitle}</h2>
      </div>
      <div className="mstats">
        {shown.map(([label, v, dec]) => {
          const [h, a] = v!;
          const share = h + a > 0 ? h / (h + a) : null;
          return (
            <div key={label} className="mstat">
              <b className="num">{dec ? f.dec(h) : h}</b>
              <span>
                <small>{label}</small>
                <span className="mstat-bar">
                  {share !== null && (
                    <>
                      <span style={{ flexGrow: share }} />
                      <span className="a" style={{ flexGrow: 1 - share }} />
                    </>
                  )}
                </span>
              </span>
              <b className="num">{dec ? f.dec(a) : a}</b>
            </div>
          );
        })}
      </div>
    </section>
  );
}
