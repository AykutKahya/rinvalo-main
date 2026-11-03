import { dict, type Lang } from "@/lib/i18n";
import type { SquadEntry } from "@/lib/data";
import { team } from "@/lib/teams";
import { Crest } from "./Crest";

/** Absentees before the line-ups are out, then both starting elevens (from API-FOOTBALL). */
export function Squads({ entry, home, away, lang }: { entry: SquadEntry; home: string; away: string; lang: Lang }) {
  const t = dict(lang).squads;
  const sides = [
    [home, "home"],
    [away, "away"],
  ] as const;

  if (entry.lineups) {
    return (
      <section className="card card-pad">
        <div className="section-title">
          <h2>{t.lineups}</h2>
          <span className="muted" style={{ fontSize: 12 }}>
            {t.confirmed}
          </span>
        </div>
        <div className="squads">
          {sides.map(([slug, side]) => {
            const l = entry.lineups![side];
            return (
              <div key={side} className="squad-col">
                <div className="tname">
                  <Crest slug={slug} size="sm" />
                  <span>{team(slug, lang).name}</span>
                </div>
                <small className="muted">
                  {[l.formation, l.coach && t.coach(l.coach)].filter(Boolean).join(" · ")}
                </small>
                <ol className="xi">
                  {l.xi.map((p) => (
                    <li key={p.id || p.name}>
                      <span className="xi-n num">{p.number ?? ""}</span>
                      <span className="xi-name">{p.name}</span>
                      {p.pos && <span className="xi-pos">{t.pos[p.pos as keyof typeof t.pos] ?? p.pos}</span>}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  const absent = entry.absent;
  if (!absent || (!absent.home.length && !absent.away.length)) return null;
  return (
    <section className="card card-pad">
      <div className="section-title">
        <h2>{t.absent}</h2>
      </div>
      <div className="squads">
        {sides.map(([slug, side]) => (
          <div key={side} className="squad-col">
            <div className="tname">
              <Crest slug={slug} size="sm" />
              <span>{team(slug, lang).name}</span>
            </div>
            {absent[side].length ? (
              <ul className="absent">
                {absent[side].map((p) => (
                  <li key={p.name}>
                    <span className={`absent-k ${p.kind}`}>{p.kind === "out" ? t.out : t.doubt}</span>
                    <span className="xi-name">{p.name}</span>
                    {p.reason && <small className="muted">{t.reason(p.reason)}</small>}
                  </li>
                ))}
              </ul>
            ) : (
              <small className="muted">{t.none}</small>
            )}
          </div>
        ))}
      </div>
      <p className="muted" style={{ margin: "10px 0 0", fontSize: 12 }}>
        {t.note}
      </p>
    </section>
  );
}
