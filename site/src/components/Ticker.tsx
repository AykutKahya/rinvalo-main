import Link from "next/link";
import { getMatches } from "@/lib/data";
import { pct, shortDay, time } from "@/lib/format";
import { pickOf } from "@/lib/model";
import { team } from "@/lib/teams";
import { Crest } from "./Crest";

/** Scrolling strip of upcoming picks under the header, like a news ticker. */
export function Ticker() {
  const now = Date.now();
  const items = getMatches()
    .filter((m) => m.status === "scheduled" && m.prediction && Date.parse(m.kickoff) > now)
    .slice(0, 24);
  if (!items.length) return null;
  const row = items.map((m) => {
    const p = m.prediction!;
    const pick = pickOf(p.p);
    return (
      <Link key={m.id} href={`/mac/${m.id}`} className="tk-item">
        <span className="tk-when">
          {shortDay(m.kickoff)} {time(m.kickoff)}
        </span>
        <Crest slug={m.home} size="sm" />
        <b>{team(m.home).short}</b>
        <span className="tk-score">
          {p.score[0]}-{p.score[1]}
        </span>
        <b>{team(m.away).short}</b>
        <Crest slug={m.away} size="sm" />
        <span className="tk-pct">{pct(p.p[pick])}</span>
      </Link>
    );
  });
  return (
    <div className="ticker" aria-label="Yaklaşan maç tahminleri">
      <span className="tk-label">Tahminler</span>
      <div className="tk-viewport">
        <div className="tk-track">
          <div className="tk-row">{row}</div>
          <div className="tk-row" aria-hidden="true">
            {row}
          </div>
        </div>
      </div>
    </div>
  );
}
