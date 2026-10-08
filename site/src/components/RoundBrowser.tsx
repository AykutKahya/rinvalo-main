"use client";

import { useState } from "react";
import type { MatchView } from "@/lib/data";
import { fmt } from "@/lib/format";
import { dict, type Lang } from "@/lib/i18n";
import { useFavorites } from "./favorites";
import { MatchRow } from "./MatchRow";

/** Steps through a league's matchdays or a cup's stages. `labels[i]` names `rounds[i]`. */
export function RoundBrowser({ matches, rounds, labels, initial, lang }: { matches: MatchView[]; rounds: number[]; labels: string[]; initial: number; lang: Lang }) {
  const [round, setRound] = useState(initial);
  const at = Math.max(rounds.indexOf(round), 0);
  const { favorites } = useFavorites();
  const t = dict(lang);
  const f = fmt(lang);
  const list = matches.filter((m) => m.round === round).sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const byDay = new Map<string, MatchView[]>();
  for (const m of list) {
    const k = f.longDay(m.kickoff);
    byDay.set(k, [...(byDay.get(k) ?? []), m]);
  }
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <button className="btn ghost" onClick={() => setRound(rounds[Math.max(0, at - 1)])} disabled={at <= 0} aria-label={t.rounds.prev}>
          ←
        </button>
        <label style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <select id="round-select" value={round} onChange={(e) => setRound(Number(e.target.value))} className="chip" style={{ fontSize: 15, padding: "8px 12px" }}>
            {rounds.map((r, i) => (
              <option key={r} value={r}>
                {labels[i]}
              </option>
            ))}
          </select>
        </label>
        <button className="btn ghost" onClick={() => setRound(rounds[Math.min(rounds.length - 1, at + 1)])} disabled={at >= rounds.length - 1} aria-label={t.rounds.next}>
          →
        </button>
      </div>
      {[...byDay.entries()].map(([d, ms]) => (
        <div key={d} className="card group">
          <div className="group-head">
            <span>{d}</span>
            <span>{t.colsPick}</span>
          </div>
          {ms.map((m) => (
            <MatchRow key={m.id} m={m} favorites={favorites} lang={lang} />
          ))}
        </div>
      ))}
      {list.length === 0 && <div className="card empty">{t.rounds.empty}</div>}
    </div>
  );
}
