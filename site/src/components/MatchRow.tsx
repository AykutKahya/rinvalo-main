import Link from "next/link";
import type { MatchView } from "@/lib/data";
import { fmt } from "@/lib/format";
import { dict, paths, type Lang } from "@/lib/i18n";
import { pickOf } from "@/lib/model";
import { team } from "@/lib/teams";
import { ConfidenceDot } from "./Confidence";
import { Crest } from "./Crest";

const LABELS = ["1", "X", "2"];

export function MatchRow({ m, lang, favorites = [], showDate = false }: { m: MatchView; lang: Lang; favorites?: string[]; showDate?: boolean }) {
  const f = fmt(lang);
  const t = dict(lang);
  const p = m.prediction;
  const pick = p ? pickOf(p.p) : -1;
  const finished = m.status === "finished";
  const homeWin = finished && m.hg! > m.ag!;
  const awayWin = finished && m.ag! > m.hg!;
  const verdict = m.hit === null ? "" : m.hit ? " ok" : " no";

  return (
    <Link href={paths(lang).matchOf(m.id)} className="mrow">
      <span className="t">
        {m.status === "live" ? (
          <span className="pill live">{t.row.live}</span>
        ) : m.status === "postponed" ? (
          <span className="pill neutral">{t.row.postponed}</span>
        ) : finished ? (
          <span className="ft">{t.row.ft}</span>
        ) : (
          f.time(m.kickoff)
        )}
        {showDate && (
          <small>
            {f.dayNum(m.kickoff)} {f.shortDay(m.kickoff)}
          </small>
        )}
      </span>
      <span className="teams">
        {[
          [m.home, m.hg, homeWin],
          [m.away, m.ag, awayWin],
        ].map(([slug, goals, win]) => (
          <span key={slug as string} className={win ? "win" : undefined}>
            <Crest slug={slug as string} size="sm" />
            <span className="nm">{team(slug as string, lang).name}</span>
            {favorites.includes(slug as string) && (
              <span className="fav-star" aria-label={t.row.fav}>
                ★
              </span>
            )}
            {(finished || m.status === "live") && <span className="g">{goals as number}</span>}
          </span>
        ))}
      </span>
      {p ? (
        <span className="p3" aria-label={t.probPick(f.pct(p.p[0]), f.pct(p.p[1]), f.pct(p.p[2]))}>
          {p.p.map((v, i) => (
            <span key={i} className={i === pick ? `hi${verdict}` : undefined}>
              {LABELS[i]} {f.pct(v)}
            </span>
          ))}
        </span>
      ) : (
        <span className="p3" aria-label={t.row.none} />
      )}
      {finished && p && m.hit !== null ? (
        // After the final whistle: the real score sits next to the teams; this box is clearly Rinvalo's pick and how it went.
        <span className={`sc done${m.exact ? " exact" : verdict}`} aria-label={`${t.row.predicted} ${p.score[0]}-${p.score[1]}, ${m.hit ? t.row.hit : t.row.miss}`}>
          <small>{t.row.pick}</small>
          <b>
            {p.score[0]}-{p.score[1]}
          </b>
          <i>{m.exact ? t.row.vExact : m.hit ? t.row.vHit : t.row.vMiss}</i>
        </span>
      ) : (
        <span className="sc" title={t.row.predicted}>
          {p ? `${p.score[0]}-${p.score[1]}` : "–"}
          {!finished && <ConfidenceDot level={p?.confidence} lang={lang} />}
        </span>
      )}
    </Link>
  );
}
