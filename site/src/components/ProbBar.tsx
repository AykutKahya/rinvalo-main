import { fmt } from "@/lib/format";
import { dict, type Lang } from "@/lib/i18n";
import { CountUp } from "./CountUp";

export function ProbBar({ p, lang, labels }: { p: [number, number, number]; lang: Lang; labels?: [string, string, string] }) {
  const f = fmt(lang);
  return (
    <div>
      <div className="pbar" role="img" aria-label={dict(lang).prob(f.pct(p[0]), f.pct(p[1]), f.pct(p[2]))}>
        <span className="h" style={{ width: `${p[0] * 100}%` }} />
        <span className="d" style={{ width: `${p[1] * 100}%` }} />
        <span className="a" style={{ width: `${p[2] * 100}%` }} />
      </div>
      <div className="plabels">
        {p.map((v, i) => (
          <span key={i}>
            {labels ? `${labels[i]} ` : ""}
            <b>
              <CountUp value={v} lang={lang} />
            </b>
          </span>
        ))}
      </div>
    </div>
  );
}
