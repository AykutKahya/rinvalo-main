"use client";

import { useEffect, useRef, useState } from "react";
import { fmt } from "@/lib/format";
import { dict, type Lang } from "@/lib/i18n";
import type { Point, TeamSeries } from "@/lib/series";

const H = 220;
const PAD = { l: 44, r: 14, t: 14, b: 26 };

type Line = { points: Point[]; color: string; label: string };

/** Small SVG line chart drawn to one scale; `invert` puts 1 at the top (league position). */
function Chart({
  lines,
  lang,
  invert = false,
  min,
  max,
  digits = 0,
}: {
  lines: Line[];
  lang: Lang;
  invert?: boolean;
  min?: number;
  max?: number;
  digits?: number;
}) {
  const f = fmt(lang);
  // Draw at the real width so axis text keeps its size on phones.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const all = lines.flatMap((l) => l.points);
  if (all.length < 2) return <div className="chart-empty">–</div>;
  const dates = [...new Set(all.map((p) => p.date))].sort();
  const lo = min ?? Math.min(...all.map((p) => p.value));
  const hi = max ?? Math.max(...all.map((p) => p.value));
  const span = hi - lo || 1;
  const x = (d: string) => PAD.l + ((W - PAD.l - PAD.r) * dates.indexOf(d)) / Math.max(dates.length - 1, 1);
  const y = (v: number) => {
    const k = (v - lo) / span;
    return PAD.t + (H - PAD.t - PAD.b) * (invert ? k : 1 - k);
  };
  const ticks = [lo, lo + span / 2, hi];
  const label = (v: number) => (digits ? f.dec(v, digits) : String(Math.round(v)));
  return (
    <div ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="chart" role="img">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="chart-grid" />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" className="chart-axis">
              {label(v)}
            </text>
          </g>
        ))}
        <text x={PAD.l} y={H - 6} className="chart-axis">
          {f.dayNum(dates[0])} {f.fullDate(dates[0]).split(" ")[1]}
        </text>
        <text x={W - PAD.r} y={H - 6} textAnchor="end" className="chart-axis">
          {f.dayNum(dates[dates.length - 1])} {f.fullDate(dates[dates.length - 1]).split(" ")[1]}
        </text>
        {lines.map((l) => (
          <g key={l.label}>
            <polyline
              points={l.points.map((p) => `${x(p.date)},${y(p.value)}`).join(" ")}
              fill="none"
              stroke={l.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {l.points.map((p) => (
              <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r="4" fill={l.color}>
                <title>{`${f.fullDate(p.date)} · ${l.label}: ${label(p.value)}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function SeasonChart({ series, lang }: { series: TeamSeries; lang: Lang }) {
  const t = dict(lang).chart;
  const tabs = [
    { id: "rating", label: t.rating, show: series.rating.length > 1 },
    { id: "position", label: t.position, show: series.position.length > 1 },
    { id: "xg", label: t.xg, show: series.xgFor.length > 1 },
  ].filter((x) => x.show);
  const [tab, setTab] = useState(tabs[0]?.id);
  if (!tabs.length) return null;
  return (
    <section className="card card-pad">
      <div className="section-title" style={{ margin: 0 }}>
        <h2 style={{ fontSize: 16 }}>{t.title}</h2>
        <div className="seg" role="tablist">
          {tabs.map((x) => (
            <button key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)}>
              {x.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "rating" && <Chart lines={[{ points: series.rating, color: "var(--accent)", label: t.rating }]} lang={lang} />}
      {tab === "position" && (
        <Chart lines={[{ points: series.position, color: "var(--accent)", label: t.position }]} lang={lang} invert min={1} max={series.teams} />
      )}
      {tab === "xg" && (
        <>
          <Chart
            lines={[
              { points: series.xgFor, color: "var(--good)", label: t.xgFor },
              { points: series.xgAgainst, color: "var(--bad)", label: t.xgAgainst },
            ]}
            lang={lang}
            min={0}
            digits={1}
          />
          <p className="chart-legend">
            <span style={{ color: "var(--good)" }}>● {t.xgFor}</span>
            <span style={{ color: "var(--bad)" }}>● {t.xgAgainst}</span>
            <span>{t.rolling}</span>
          </p>
        </>
      )}
    </section>
  );
}
