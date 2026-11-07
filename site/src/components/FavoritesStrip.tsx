"use client";

import Link from "next/link";
import type { MatchView } from "@/lib/data";
import { fmt } from "@/lib/format";
import { dict, paths, type Lang } from "@/lib/i18n";
import { team } from "@/lib/teams";
import { Crest } from "./Crest";
import { useFavorites } from "./favorites";

/** The next game of each favourite team, at the top of the home page. */
export function FavoritesStrip({ matches, lang }: { matches: MatchView[]; lang: Lang }) {
  const { favorites } = useFavorites();
  if (!favorites.length) return null;
  const f = fmt(lang);
  const p = paths(lang);
  const h = dict(lang).home;
  const now = Date.now();
  const rows = favorites
    .map((slug) => matches.find((m) => (m.home === slug || m.away === slug) && m.status !== "finished" && Date.parse(m.kickoff) > now - 3 * 3600_000))
    .filter((m, i, all): m is MatchView => !!m && all.findIndex((x) => x?.id === m.id) === i)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  if (!rows.length) return null;
  return (
    <section className="card card-pad fav-strip" aria-label={h.myTeams}>
      <div className="section-title" style={{ margin: 0 }}>
        <h2 style={{ fontSize: 15 }}>{h.myTeams}</h2>
      </div>
      <div className="fav-rows">
        {rows.map((m) => (
          <Link key={m.id} href={p.matchOf(m.id)} className="fav-row">
            <span className="muted num fav-when">
              {f.shortDay(m.kickoff)} {f.time(m.kickoff)}
            </span>
            <span className="tname">
              <Crest slug={m.home} size="sm" />
              {team(m.home, lang).name}
            </span>
            <b className="num fav-score">{m.prediction ? `${m.prediction.score[0]}-${m.prediction.score[1]}` : "–"}</b>
            <span className="tname">
              <Crest slug={m.away} size="sm" />
              {team(m.away, lang).name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
