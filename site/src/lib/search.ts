import { crestSrc, leagueSrc } from "@/components/Crest";
import type { SearchItem } from "@/components/Search";
import { getMatches, LEAGUES, seasonTeams } from "./data";
import { shortDay, dayNum, time } from "./format";
import { team } from "./teams";

const DAY = 86_400_000;

/** Everything the search box can jump to: leagues, this season's teams and the next two weeks of games. */
export function searchIndex(now = Date.now()): SearchItem[] {
  const leagueName = new Map(LEAGUES.map((l) => [l.code, l.name]));
  const leagues: SearchItem[] = LEAGUES.map((l) => ({ kind: "league", label: l.name, sub: l.country, href: `/lig/${l.code}`, img: leagueSrc(l.code) }));
  const teams: SearchItem[] = seasonTeams()
    .map(({ slug, league }) => ({
      kind: "team" as const,
      label: team(slug).name,
      sub: leagueName.get(league) ?? "",
      href: `/takim/${slug}`,
      img: crestSrc(slug),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "tr"));
  const matches: SearchItem[] = getMatches()
    .filter((m) => m.status !== "finished" && Date.parse(m.kickoff) > now - DAY && Date.parse(m.kickoff) < now + 14 * DAY)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    .map((m) => ({
      kind: "match",
      label: `${team(m.home).name} – ${team(m.away).name}`,
      sub: `${dayNum(m.kickoff)} ${shortDay(m.kickoff)} ${time(m.kickoff)} · ${leagueName.get(m.league)}`,
      href: `/mac/${m.id}`,
      img: crestSrc(m.home),
    }));
  return [...leagues, ...teams, ...matches];
}
