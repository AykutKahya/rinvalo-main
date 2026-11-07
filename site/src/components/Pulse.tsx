import Link from "next/link";
import { fmt } from "@/lib/format";
import { dict, paths, type Lang } from "@/lib/i18n";
import { competitionName } from "@/lib/leagues";
import { pulse } from "@/lib/pulse";
import { team } from "@/lib/teams";
import { Crest } from "./Crest";

/** Home page card: the biggest moves since yesterday. */
export function Pulse({ lang, now }: { lang: Lang; now: number }) {
  const items = pulse(now);
  if (!items.length) return null;
  const h = dict(lang).home;
  const f = fmt(lang);
  const p = paths(lang);
  const name = (s: string) => team(s, lang).name;
  const move = (from: number, to: number, bad = false) => (
    <span className={`pulse-move ${(to > from) !== bad ? "up" : "down"}`}>
      {f.pct(from / 1000)} → {f.pct(to / 1000)}
    </span>
  );
  return (
    <div className="card card-pad">
      <div className="section-title">
        <h2 style={{ fontSize: 15 }}>{h.pulse}</h2>
      </div>
      <div className="pulse-list">
        {items.map((i) => {
          if (i.kind === "match") {
            const label = i.side === 1 ? h.pulseDraw : h.pulseWin(name(i.side === 0 ? i.home : i.away));
            return (
              <Link key={i.id} href={p.matchOf(i.id)} className="pulse-item">
                <span className="pulse-crests">
                  <Crest slug={i.home} size="sm" />
                  <Crest slug={i.away} size="sm" />
                </span>
                <span className="pulse-txt">
                  <small>
                    {name(i.home)} – {name(i.away)}
                  </small>
                  <b>{label}</b>
                </span>
                {move(i.from, i.to)}
              </Link>
            );
          }
          if (i.kind === "elo") {
            return (
              <Link key={`e-${i.team}`} href={p.teamOf(i.team)} className="pulse-item">
                <span className="pulse-crests">
                  <Crest slug={i.team} size="sm" />
                </span>
                <span className="pulse-txt">
                  <small>{name(i.team)}</small>
                  <b>{h.pulseElo}</b>
                </span>
                <span className={`pulse-move ${i.delta > 0 ? "up" : "down"}`}>{i.delta > 0 ? `+${i.delta}` : `−${-i.delta}`}</span>
              </Link>
            );
          }
          const bad = i.kind === "relegation";
          return (
            <Link key={`${i.kind}-${i.team}`} href={p.teamOf(i.team)} className="pulse-item">
              <span className="pulse-crests">
                <Crest slug={i.team} size="sm" />
              </span>
              <span className="pulse-txt">
                <small>
                  {name(i.team)} · {competitionName(i.comp, lang)}
                </small>
                <b>{bad ? h.pulseRelegation : h.pulseChampion}</b>
              </span>
              {move(i.from, i.to, bad)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
