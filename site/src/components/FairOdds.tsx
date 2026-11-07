import { fmt } from "@/lib/format";
import { dict, type Lang } from "@/lib/i18n";
import type { Prediction } from "@/lib/types";

/** The result and goal probabilities the engine gives, with the market's where it has one. */
export function FairOdds({ p, lang }: { p: Prediction; lang: Lang }) {
  const t = dict(lang).fair;
  const f = fmt(lang);
  const [h, d, a] = p.p;
  const groups: [string, [string, number, number?][]][] = [
    [t.result, [["1", h], ["X", d], ["2", a]]],
    [
      t.goals,
      [
        [t.over, p.over25, p.marketOver25 ?? undefined],
        [t.under, 1 - p.over25, p.marketOver25 != null ? 1 - p.marketOver25 : undefined],
        [t.bttsYes, p.btts, p.marketBtts ?? undefined],
        [t.bttsNo, 1 - p.btts, p.marketBtts != null ? 1 - p.marketBtts : undefined],
      ],
    ],
  ];
  return (
    <div className="fair">
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        {t.title}
      </div>
      {groups.map(([name, cells]) => (
        <div key={name} className="fair-row">
          <span className="fair-name">{name}</span>
          <div className="fair-cells" style={{ "--n": cells.length, "--m": cells.length === 4 ? 2 : cells.length } as React.CSSProperties}>
            {cells.map(([label, v, mk]) => (
              <span key={label} className="fair-cell">
                <small>{label}</small>
                <b>{f.pct(v)}</b>
                {mk != null && (
                  <i className="fair-mk">
                    {t.market} {f.pct(mk)}
                  </i>
                )}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
