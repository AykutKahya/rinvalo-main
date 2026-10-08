"use client";

import { useState } from "react";
import type { MatchView } from "@/lib/data";
import { longDay } from "@/lib/format";
import { useFavorites } from "./favorites";
import { MatchRow } from "./MatchRow";

export function RoundBrowser({ matches, rounds, initial }: { matches: MatchView[]; rounds: number; initial: number }) {
  const [round, setRound] = useState(initial);
  const { favorites } = useFavorites();
  const list = matches.filter((m) => m.round === round).sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const byDay = new Map<string, MatchView[]>();
  for (const m of list) {
    const k = longDay(m.kickoff);
    byDay.set(k, [...(byDay.get(k) ?? []), m]);
  }
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <button className="btn ghost" onClick={() => setRound(Math.max(1, round - 1))} disabled={round <= 1} aria-label="Önceki hafta">
          ←
        </button>
        <label style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <select id="round-select" value={round} onChange={(e) => setRound(Number(e.target.value))} className="chip" style={{ fontSize: 15, padding: "8px 12px" }}>
            {Array.from({ length: rounds }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}. hafta
              </option>
            ))}
          </select>
        </label>
        <button className="btn ghost" onClick={() => setRound(Math.min(rounds, round + 1))} disabled={round >= rounds} aria-label="Sonraki hafta">
          →
        </button>
      </div>
      {[...byDay.entries()].map(([d, ms]) => (
        <div key={d} className="card group">
          <div className="group-head">
            <span>{d}</span>
            <span>1 · X · 2 &nbsp; Skor</span>
          </div>
          {ms.map((m) => (
            <MatchRow key={m.id} m={m} favorites={favorites} />
          ))}
        </div>
      ))}
      {list.length === 0 && <div className="card empty">Bu haftanın fikstürü henüz açıklanmadı.</div>}
    </div>
  );
}
