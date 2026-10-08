import { pct } from "@/lib/format";
import { CountUp } from "./CountUp";

export function ProbBar({ p, labels }: { p: [number, number, number]; labels?: [string, string, string] }) {
  return (
    <div>
      <div className="pbar" role="img" aria-label={`Ev sahibi ${pct(p[0])}, beraberlik ${pct(p[1])}, deplasman ${pct(p[2])}`}>
        <span className="h" style={{ width: `${p[0] * 100}%` }} />
        <span className="d" style={{ width: `${p[1] * 100}%` }} />
        <span className="a" style={{ width: `${p[2] * 100}%` }} />
      </div>
      <div className="plabels">
        {p.map((v, i) => (
          <span key={i}>
            {labels ? `${labels[i]} ` : ""}
            <b>
              <CountUp value={v} />
            </b>
          </span>
        ))}
      </div>
    </div>
  );
}
