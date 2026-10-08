import Link from "next/link";
import type { MatchView } from "@/lib/data";
import { dayNum, shortDay, time } from "@/lib/format";
import { team } from "@/lib/teams";
import { Crest } from "./Crest";

/** A compact match line with one highlighted figure on the right. */
export function SurpriseRow({ m, figure, note, tone }: { m: MatchView; figure: string; note: string; tone: "plain" | "bad" | "warn" }) {
  const done = m.status === "finished" && m.hg !== null;
  return (
    <Link href={`/mac/${m.id}`} className="srow">
      <span className="srow-when">
        {done ? "MS" : time(m.kickoff)}
        <small>
          {dayNum(m.kickoff)} {shortDay(m.kickoff)}
        </small>
      </span>
      <span className="srow-teams">
        {[
          [m.home, m.hg],
          [m.away, m.ag],
        ].map(([slug, g]) => (
          <span key={slug as string}>
            <Crest slug={slug as string} size="sm" />
            <span className="nm">{team(slug as string).name}</span>
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
