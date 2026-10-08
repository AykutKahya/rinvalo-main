"use client";

import { useEffect, useState } from "react";
import { fmt } from "@/lib/format";
import { dict, type Lang } from "@/lib/i18n";
import { liveOdds, minutePlayed } from "@/lib/live";

/** In-play 1-X-2 for a live match, recalculated every minute in the browser. */
export function LiveOdds({ kickoff, lh, la, hg, ag, home, away, lang }: { kickoff: string; lh: number; la: number; hg: number; ag: number; home: string; away: string; lang: Lang }) {
  const t = dict(lang).live;
  const { pct } = fmt(lang);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return null;
  const minute = minutePlayed(kickoff, now);
  const p = liveOdds(lh, la, hg, ag, minute);
  const labels = [home, dict(lang).draw, away];
  return (
    <section className="card card-pad live-odds">
      <div className="section-title" style={{ margin: 0 }}>
        <h2>
          <span className="live-dot" aria-hidden="true" /> {t.title}
        </h2>
        <span className="pill live">
          {hg}-{ag} · {t.minute(minute)}
        </span>
      </div>
      <div className="pbar">
        <span className="h" style={{ width: `${p[0] * 100}%` }} />
        <span className="d" style={{ width: `${p[1] * 100}%` }} />
        <span className="a" style={{ width: `${p[2] * 100}%` }} />
      </div>
      <div className="plabels">
        {p.map((v, i) => (
          <span key={i}>
            {labels[i]} <b>{pct(v)}</b>
          </span>
        ))}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        {t.note}
      </p>
    </section>
  );
}
