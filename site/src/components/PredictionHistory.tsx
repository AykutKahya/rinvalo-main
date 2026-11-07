import { fmt } from "@/lib/format";
import { dict, type Lang } from "@/lib/i18n";

type Point = [string, number, number, number];

const W = 640;
const H = 150;
const PAD = { l: 8, r: 70, t: 12, b: 24 };

/** How the 1-X-2 moved before kick-off, as steps: each point holds until the next update. */
export function PredictionHistory({ line, labels, lang }: { line: Point[]; labels: [string, string, string]; lang: Lang }) {
  if (line.length < 2) return null;
  const f = fmt(lang);
  const t0 = Date.parse(line[0][0] + "Z");
  const t1 = Math.max(Date.parse(line[line.length - 1][0] + "Z"), t0 + 3600_000);
  const x = (s: string) => PAD.l + ((Date.parse(s + "Z") - t0) / (t1 - t0)) * (W - PAD.l - PAD.r);
  const v = (pt: Point, k: number): number => (k === 0 ? pt[1] : k === 1 ? pt[2] : pt[3]);
  const max = Math.max(600, ...line.flatMap((pt) => [v(pt, 0), v(pt, 1), v(pt, 2)]));
  const y = (pm: number) => PAD.t + (1 - pm / max) * (H - PAD.t - PAD.b);
  const path = (k: number) =>
    line.map((pt, i) => (i === 0 ? `M${x(pt[0])},${y(v(pt, k))}` : `H${x(pt[0])}V${y(v(pt, k))}`)).join("") + `H${W - PAD.r}`;
  const cls = ["ph-home", "ph-draw", "ph-away"];
  const last = line[line.length - 1];
  // End labels, nudged apart so they never overlap.
  const ends = [0, 1, 2].map((k) => ({ k, y: y(v(last, k)) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
  return (
    <figure className="ph">
      <figcaption>{dict(lang).match.historyTitle}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={dict(lang).match.historyTitle}>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} className="ph-grid" x1={PAD.l} x2={W - PAD.r} y1={y(g * max)} y2={y(g * max)} />
        ))}
        {[0, 1, 2].map((k) => (
          <path key={k} className={cls[k]} d={path(k)} />
        ))}
        {ends.map(({ k, y: ly }) => (
          <text key={k} className={`ph-lbl ${cls[k]}`} x={W - PAD.r + 6} y={ly + 4}>
            {labels[k]} {Math.round(v(last, k) / 10)}
          </text>
        ))}
        <text className="ph-axis" x={PAD.l} y={H - 6}>
          {f.shortDay(line[0][0] + "Z")} {f.dayNum(line[0][0] + "Z")}
        </text>
        <text className="ph-axis" x={W - PAD.r} y={H - 6} textAnchor="end">
          {f.shortDay(last[0] + "Z")} {f.dayNum(last[0] + "Z")}
        </text>
      </svg>
    </figure>
  );
}
