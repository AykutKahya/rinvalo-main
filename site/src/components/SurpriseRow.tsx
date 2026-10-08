import Link from "next/link";
import type { MatchView } from "@/lib/data";
import { fmt } from "@/lib/format";
import { dict, paths, type Lang } from "@/lib/i18n";
import { team } from "@/lib/teams";
import { Crest } from "./Crest";

/** A compact match line with one highlighted figure on the right. */
export function SurpriseRow({ m, lang, figure, note, tone }: { m: MatchView; lang: Lang; figure: string; note: string; tone: "plain" | "bad" | "warn" }) {
  const f = fmt(lang);
  const done = m.status === "finished" && m.hg !== null;
  return (
    <Link href={paths(lang).matchOf(m.id)} className="srow">
      <span className="srow-when">
        {done ? dict(lang).row.ft : f.time(m.kickoff)}
        <small>
          {f.dayNum(m.kickoff)} {f.shortDay(m.kickoff)}
        </small>
      </span>
      <span className="srow-teams">
        {[
          [m.home, m.hg],
          [m.away, m.ag],
        ].map(([slug, g]) => (
          <span key={slug as string}>
            <Crest slug={slug as string} size="sm" />
            <span className="nm">{team(slug as string, lang).name}</span>
            {done && <b className="num">{g as number}</b>}
          </span>
        ))}
      </span>
      <span className="srow-fig">
        <b className={`tone-${tone}`}>{figure}</b>
        <small>{note}</small>
      </span>
    </Link>
  );
}
