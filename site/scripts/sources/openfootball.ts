import { fixtureId } from "../../src/lib/leagues";
/**
 * openfootball (GitHub'da açık veri, anahtar yok). Yalnız yedek olarak kullanılır: ana kaynakta
 * skoru gelmeyen bitmiş maçların sonucunu doldurur. Süper Lig dosyası yoktur.
 */
import type { League } from "../../src/lib/leagues";
import { resolveTeam } from "../../src/lib/teams";

export interface OpenfootballResult {
  id: string;
  hg: number;
  ag: number;
}

const LINE = /^\s+(?:\d{1,2}[.:]\d{2}\s+)?(.+?)\s+v\s+(.+?)\s+(\d+)-(\d+)(?:\s+\(\d+-\d+\))?\s*$/;

export function parseOpenfootball(text: string): OpenfootballResult[] {
  const out: OpenfootballResult[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(LINE);
    if (!m) continue;
    const home = resolveTeam(m[1].trim());
    const away = resolveTeam(m[2].trim());
    if (!home || !away) continue;
    out.push({ id: fixtureId(home, away), hg: Number(m[3]), ag: Number(m[4]) });
  }
  return out;
}

export async function fetchOpenfootball(league: League): Promise<OpenfootballResult[]> {
  if (!league.openfootball) return [];
  const res = await fetch(`https://raw.githubusercontent.com/openfootball/${league.openfootball}`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseOpenfootball(await res.text());
}
