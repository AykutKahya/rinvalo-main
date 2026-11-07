"use client";

import type { MatchView } from "@/lib/data";
import type { Lang } from "@/lib/i18n";
import { MatchRow } from "./MatchRow";
import { Pager, usePage } from "./Pager";

/** A long list of match rows drawn in the browser, one page at a time; only the light data is sent. */
export function PagedMatches({ matches, per = 15, lang, empty }: { matches: MatchView[]; per?: number; lang: Lang; empty?: React.ReactNode }) {
  const pg = usePage(matches.length, per);
  if (matches.length === 0) return <>{empty ?? null}</>;
  return (
    <>
      {matches.slice(pg.from, pg.to).map((m) => (
        <MatchRow key={m.id} m={m} showDate lang={lang} />
      ))}
      <Pager {...pg} total={matches.length} onChange={pg.setPage} lang={lang} />
    </>
  );
}
