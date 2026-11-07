import { getDaily, getMatches, getPredictionHistory, getRatings } from "./data";

export type PulseItem =
  | { kind: "champion" | "relegation"; team: string; comp: string; from: number; to: number; size: number }
  | { kind: "elo"; team: string; delta: number; size: number }
  | { kind: "match"; id: string; home: string; away: string; side: 0 | 1 | 2; from: number; to: number; size: number };

const DAY = 86_400_000;

/** What moved since the day before: season odds, power ratings after the last game, match predictions. */
export function pulse(now: number, limit = 6): PulseItem[] {
  const items: PulseItem[] = [];
  const days = getDaily();
  const keys = Object.keys(days).sort();
  if (keys.length >= 2) {
    const [a, b] = [days[keys[keys.length - 2]], days[keys[keys.length - 1]]];
    for (const comp of Object.keys(b)) {
      if (comp === "elo") continue;
      const before = a[comp] as Record<string, number[]> | undefined;
      const after = b[comp] as Record<string, number[]>;
      if (!before) continue;
      for (const [team, v] of Object.entries(after)) {
        const o = before[team];
        if (!o) continue;
        if (Math.abs(v[0] - o[0]) >= 30) items.push({ kind: "champion", team, comp, from: o[0], to: v[0], size: Math.abs(v[0] - o[0]) });
        if (Math.abs(v[2] - o[2]) >= 30) items.push({ kind: "relegation", team, comp, from: o[2], to: v[2], size: Math.abs(v[2] - o[2]) });
      }
    }
  }

  for (const rows of Object.values(getRatings().leagues)) {
    for (const r of rows) {
      const last = r.hist?.[r.hist.length - 1]?.[0];
      if (last && Math.abs(r.last) >= 15 && now - Date.parse(last) < 7 * DAY) items.push({ kind: "elo", team: r.team, delta: Math.round(r.last), size: Math.abs(r.last) * 2 });
    }
  }

  const hist = getPredictionHistory();
  for (const m of getMatches()) {
    const k = Date.parse(m.kickoff);
    if (m.status !== "scheduled" || k < now || k > now + 7 * DAY) continue;
    const line = hist[m.id];
    if (!line || line.length < 2) continue;
    const first = line[0].slice(1) as number[];
    const last = line[line.length - 1].slice(1) as number[];
    const side = [0, 1, 2].reduce((x, y) => (Math.abs(last[y] - first[y]) > Math.abs(last[x] - first[x]) ? y : x), 0) as 0 | 1 | 2;
    const size = Math.abs(last[side] - first[side]);
    if (size >= 40) items.push({ kind: "match", id: m.id, home: m.home, away: m.away, side, from: first[side], to: last[side], size });
  }

  // One line per team, biggest moves first.
  const seen = new Set<string>();
  return items
    .sort((x, y) => y.size - x.size)
    .filter((i) => {
      const keys = i.kind === "match" ? [i.home, i.away] : [i.team];
      if (keys.some((t) => seen.has(t))) return false;
      keys.forEach((t) => seen.add(t));
      return true;
    })
    .slice(0, limit);
}
