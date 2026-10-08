"use client";

import { useState } from "react";
import type { MatchView } from "@/lib/data";
import { fmt } from "@/lib/format";
import { dict, type Lang } from "@/lib/i18n";
import { useFavorites } from "./favorites";
import { MatchRow } from "./MatchRow";

export function RoundBrowser({ matches, rounds, initial, lang }: { matches: MatchView[]; rounds: number; initial: number; lang: Lang }) {
  const [round, setRound] = useState(initial);
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
        <button className="btn ghost" onClick={() => setRound(Math.max(1, round - 1))} disabled={round <= 1} aria-label={t.rounds.prev}>
          ←
        </button>
        <label style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <select id="round-select" value={round} onChange={(e) => setRound(Number(e.target.value))} className="chip" style={{ fontSize: 15, padding: "8px 12px" }}>
            {Array.from({ length: rounds }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {t.round(i + 1)}
              </option>
            ))}
          </select>
        </label>
        <button className="btn ghost" onClick={() => setRound(Math.min(rounds, round + 1))} disabled={round >= rounds} aria-label={t.rounds.next}>
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
