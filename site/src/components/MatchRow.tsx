import Link from "next/link";
import type { MatchView } from "@/lib/data";
import { pct, shortDay, dayNum, time } from "@/lib/format";
import { pickOf } from "@/lib/model";
import { team } from "@/lib/teams";
import { ConfidenceDot } from "./Confidence";
import { Crest } from "./Crest";

const LABELS = ["1", "X", "2"];

export function MatchRow({ m, favorites = [], showDate = false }: { m: MatchView; favorites?: string[]; showDate?: boolean }) {
  const p = m.prediction;
  const pick = p ? pickOf(p.p) : -1;
  const finished = m.status === "finished";
  const homeWin = finished && m.hg! > m.ag!;
  const awayWin = finished && m.ag! > m.hg!;
  const verdict = m.hit === null ? "" : m.hit ? " ok" : " no";

  return (
    <Link href={`/mac/${m.id}`} className="mrow">
      <span className="t">
        {m.status === "live" ? (
          <span className="pill live">CANLI</span>
        ) : m.status === "postponed" ? (
          <span className="pill neutral">Ert.</span>
        ) : finished ? (
          <span className="ft">MS</span>
        ) : (
          time(m.kickoff)
        )}
        {showDate && (
          <small>
            {dayNum(m.kickoff)} {shortDay(m.kickoff)}
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
            <span className="nm">{team(slug as string).name}</span>
            {favorites.includes(slug as string) && <span className="fav-star" aria-label="favori">★</span>}
            {(finished || m.status === "live") && <span className="g">{goals as number}</span>}
          </span>
        ))}
      </span>
      {p ? (
        <span className="p3" aria-label={`Tahmin: ev sahibi ${pct(p.p[0])}, beraberlik ${pct(p.p[1])}, deplasman ${pct(p.p[2])}`}>
          {p.p.map((v, i) => (
            <span key={i} className={i === pick ? `hi${verdict}` : undefined}>
              {LABELS[i]} {pct(v)}
            </span>
          ))}
        </span>
      ) : (
        <span className="p3" aria-label="Bu maç için tahmin yapılmadı" />
      )}
      <span className={`sc${m.exact ? " exact" : ""}`} title="Tahmini skor">
        {p ? `${p.score[0]}-${p.score[1]}` : "–"}
        {!finished && <ConfidenceDot level={p?.confidence} />}
      </span>
      <span className={`mark${verdict}`} aria-label={m.hit === null ? undefined : m.hit ? "tahmin tuttu" : "tahmin tutmadı"}>
        {m.hit === null ? "" : m.hit ? "✓" : "✕"}
      </span>
    </Link>
  );
}
