import Link from "next/link";
import { getMatches } from "@/lib/data";
import { fmt } from "@/lib/format";
import { dict, paths, type Lang } from "@/lib/i18n";
import { pickOf } from "@/lib/model";
import { team } from "@/lib/teams";
import { Crest } from "./Crest";

/** Scrolling strip of upcoming picks under the header, like a news ticker. */
export function Ticker({ lang }: { lang: Lang }) {
  const f = fmt(lang);
  const t = dict(lang).ticker;
  const p = paths(lang);
  const now = Date.now();
  const items = getMatches()
    .filter((m) => m.status === "scheduled" && m.prediction && Date.parse(m.kickoff) > now)
    .slice(0, 24);
  if (!items.length) return null;
  const row = items.map((m) => {
    const pr = m.prediction!;
    const pick = pickOf(pr.p);
    return (
      <Link key={m.id} href={p.matchOf(m.id)} className="tk-item">
        <span className="tk-when">
          {f.shortDay(m.kickoff)} {f.time(m.kickoff)}
        </span>
        <Crest slug={m.home} size="sm" />
        <b>{team(m.home).short}</b>
        <span className="tk-score">
          {pr.score[0]}-{pr.score[1]}
        </span>
        <b>{team(m.away).short}</b>
        <Crest slug={m.away} size="sm" />
        <span className="tk-pct">{f.pct(pr.p[pick])}</span>
      </Link>
    );
  });
  return (
    <div className="ticker" aria-label={t.aria}>
      <span className="tk-label">{t.label}</span>
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
