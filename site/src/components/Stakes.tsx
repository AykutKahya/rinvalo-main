import { fmt } from "@/lib/format";
import { dict, type Lang } from "@/lib/i18n";
import type { League } from "@/lib/leagues";
import type { Stake } from "@/lib/stakes";
import { team } from "@/lib/teams";
import { Crest } from "./Crest";

/** "What's at stake": each side's season odds if it wins, draws or loses this game. */
export function Stakes({ stakes, league, lang }: { stakes: Stake[]; league: League; lang: Lang }) {
  if (!stakes.length) return null;
  const t = dict(lang).stakes;
  const { pct } = fmt(lang);
  const label = (s: Stake) =>
    s.key === "champion" ? t.champion : s.key === "relegation" ? t.relegation : league.code === "championship" ? t.promotion : t.top(league.zones.europe);
  return (
    <section className="card card-pad stakes">
      <div className="section-title" style={{ margin: 0 }}>
        <h2>{t.title}</h2>
      </div>
      <div className="stakes-head" aria-hidden="true">
        <span />
        <span>{t.win}</span>
        <span>{t.draw}</span>
        <span>{t.loss}</span>
      </div>
      {stakes.map((s) => {
        // For relegation a lower number is the good outcome.
        const good = s.key === "relegation" ? 2 : 0;
        return (
          <div key={s.team} className="stakes-row">
            <span className="tname">
              <Crest slug={s.team} size="sm" />
              <span>
                {team(s.team, lang).name}
                <small>{label(s)}</small>
              </span>
            </span>
            {s.odds.map((v, i) => (
              <b key={i} className={`num${i === good ? " good" : i === 2 - good ? " bad" : ""}`}>
                {pct(v)}
              </b>
            ))}
          </div>
        );
      })}
    </section>
  );
}
