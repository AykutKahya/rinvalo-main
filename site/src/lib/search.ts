import { crestSrc, leagueSrc, WHITE_LOGO } from "@/components/Crest";
import type { SearchItem } from "@/components/Search";
import { getMatches, LEAGUES, seasonTeams } from "./data";
import { fmt } from "./format";
import { paths, type Lang } from "./i18n";
import { countryOf } from "./leagues";
import { team } from "./teams";

const DAY = 86_400_000;

/** Everything the search box can jump to: leagues, this season's teams and the next two weeks of games. */
export function searchIndex(lang: Lang, now = Date.now()): SearchItem[] {
  const f = fmt(lang);
  const p = paths(lang);
  const leagueName = new Map(LEAGUES.map((l) => [l.code, l.name]));
  const leagues: SearchItem[] = LEAGUES.map((l) => ({ kind: "league", label: l.name, sub: countryOf(l, lang), href: p.leagueOf(l.code), img: leagueSrc(l.code), imgBg: WHITE_LOGO.has(l.code) ? l.accent : undefined }));
  const teams: SearchItem[] = seasonTeams()
    .map(({ slug, league }) => ({ kind: "team" as const, label: team(slug, lang).name, sub: leagueName.get(league) ?? "", href: p.teamOf(slug), img: crestSrc(slug) }))
    .sort((a, b) => a.label.localeCompare(b.label, lang));
  const matches: SearchItem[] = getMatches()
    .filter((m) => m.status !== "finished" && Date.parse(m.kickoff) > now - DAY && Date.parse(m.kickoff) < now + 14 * DAY)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    .map((m) => ({
      kind: "match",
      label: `${team(m.home, lang).name} – ${team(m.away, lang).name}`,
      sub: `${f.dayNum(m.kickoff)} ${f.shortDay(m.kickoff)} ${f.time(m.kickoff)} · ${leagueName.get(m.league)}`,
      href: p.matchOf(m.id),
      img: crestSrc(m.home),
    }));
  return [...leagues, ...teams, ...matches];
}
