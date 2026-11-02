import { fmt } from "@/lib/format";
import { dict, type Lang } from "@/lib/i18n";
import type { Prediction } from "@/lib/types";

/** Every market the engine prices, as a probability and the fair (margin-free) decimal odds 1/p. */
export function FairOdds({ p, lang }: { p: Prediction; lang: Lang }) {
  const t = dict(lang).fair;
  const f = fmt(lang);
  const odds = new Intl.NumberFormat(lang === "tr" ? "tr-TR" : "en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [h, d, a] = p.p;
  const groups: [string, [string, number][]][] = [
    [t.result, [["1", h], ["X", d], ["2", a]]],
    [t.double, [["1X", h + d], ["X2", d + a], ["12", h + a]]],
    [
      t.goals,
      [
        [t.over, p.over25],
        [t.under, 1 - p.over25],
        [t.bttsYes, p.btts],
        [t.bttsNo, 1 - p.btts],
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
            {cells.map(([label, v]) => (
              <span key={label} className="fair-cell">
                <small>{label}</small>
                <b>{f.pct(v)}</b>
                <em>{v > 0.005 ? odds.format(1 / v) : "–"}</em>
              </span>
            ))}
          </div>
        </div>
      ))}
      <p className="muted" style={{ margin: "6px 0 0", fontSize: 12 }}>
        {t.note}
      </p>
    </div>
  );
}
