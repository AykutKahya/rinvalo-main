"use client";

import { useState } from "react";
import { pct } from "@/lib/format";

/** Interactive heat map of every scoreline up to 5-5. */
export function ScoreGrid({ grid, home, away, actual }: { grid: number[][]; home: string; away: string; actual: [number, number] | null }) {
  const max = Math.max(...grid.flat());
  let best: [number, number] = [0, 0];
  grid.forEach((row, h) => row.forEach((p, a) => p === max && (best = [h, a])));
  const [sel, setSel] = useState<[number, number]>(actual ?? best);
  const p = grid[sel[0]]?.[sel[1]] ?? 0;

  return (
    <div>
      <div className="heat" role="grid" aria-label="Skor olasılıkları">
        <span className="hd" aria-hidden="true" />
        {grid[0].map((_, a) => (
          <span key={a} className="hd" title={`${away} golü`}>
            {a}
          </span>
        ))}
        {grid.map((row, h) => (
          <div key={h} style={{ display: "contents" }} role="row">
            <span className="hd" title={`${home} golü`}>
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
          Satır: {home} · Sütun: {away}
        </span>
        <span>
          <b style={{ color: "var(--ink)" }}>
            {sel[0]}-{sel[1]}
          </b>{" "}
          olasılığı {pct(p, 1)}
          {actual && actual[0] === sel[0] && actual[1] === sel[1] ? " · gerçek skor" : ""}
        </span>
      </div>
    </div>
  );
}
