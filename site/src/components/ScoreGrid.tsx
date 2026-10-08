"use client";

import { useState } from "react";
import { fmt } from "@/lib/format";
import { dict, type Lang } from "@/lib/i18n";

/** Interactive heat map of every scoreline up to 5-5. */
export function ScoreGrid({ grid, home, away, actual, lang }: { grid: number[][]; home: string; away: string; actual: [number, number] | null; lang: Lang }) {
  const t = dict(lang).grid;
  const { pct } = fmt(lang);
  const max = Math.max(...grid.flat());
  let best: [number, number] = [0, 0];
  grid.forEach((row, h) => row.forEach((p, a) => p === max && (best = [h, a])));
  const [sel, setSel] = useState<[number, number]>(actual ?? best);
  const p = grid[sel[0]]?.[sel[1]] ?? 0;

  return (
    <div>
      <div className="heat" role="grid" aria-label={t.aria}>
        <span className="hd" aria-hidden="true" />
        {grid[0].map((_, a) => (
          <span key={a} className="hd" title={t.goals(away)}>
            {a}
          </span>
        ))}
        {grid.map((row, h) => (
          <div key={h} style={{ display: "contents" }} role="row">
            <span className="hd" title={t.goals(home)}>
              {h}
            </span>
            {row.map((v, a) => {
              const level = Math.min(v / max, 1);
              const isActual = actual && actual[0] === h && actual[1] === a;
              return (
                <button
                  key={a}
                  role="gridcell"
                  className={`${level > 0.55 ? "dark" : ""}${isActual ? " actual" : ""}`}
                  style={{ ["--v" as string]: (0.08 + level * 0.92).toFixed(3), ["--d" as string]: `${(h + a) * 35}ms` }}
                  aria-pressed={sel[0] === h && sel[1] === a}
                  aria-label={`${h}-${a}: ${pct(v, 1)}`}
                  onClick={() => setSel([h, a])}
                  onMouseEnter={() => setSel([h, a])}
                >
                  {Math.round(v * 100)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="heat-cap">
        <span>
          {t.axes(home, away)}
        </span>
        <span>
          <b style={{ color: "var(--ink)" }}>
            {sel[0]}-{sel[1]}
          </b>{" "}
          {t.chance} {pct(p, 1)}
          {actual && actual[0] === sel[0] && actual[1] === sel[1] ? t.actual : ""}
        </span>
      </div>
    </div>
  );
}
