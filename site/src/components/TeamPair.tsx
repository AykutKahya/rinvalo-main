import type { Lang } from "@/lib/i18n";
import { team } from "@/lib/teams";
import { Crest } from "./Crest";

/** "[crest] Home – [crest] Away", or with the score between them; long names shorten with an ellipsis. */
export function TeamPair({ home, away, lang, score, short = false }: { home: string; away: string; lang: Lang; score?: string; short?: boolean }) {
  const nm = (slug: string) => (short ? team(slug, lang).short : team(slug, lang).name);
  return (
    <span className="pair">
      <span className="pair-t">
        <Crest slug={home} size="sm" />
        <span className="pair-n">{nm(home)}</span>
      </span>
      <span className={score ? "pair-s num" : "pair-sep"}>{score ?? "–"}</span>
      <span className="pair-t">
        <Crest slug={away} size="sm" />
        <span className="pair-n">{nm(away)}</span>
      </span>
    </span>
  );
}
