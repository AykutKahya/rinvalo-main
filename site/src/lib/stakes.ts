import type { MatchImpact, SideImpact } from "./types";

export type StakeKey = keyof SideImpact;

/** One team's biggest swing: odds of a season outcome if it wins, draws or loses this game. */
export interface Stake {
  team: string;
  key: StakeKey;
  /** [win, draw, loss] from this team's point of view. */
  odds: [number, number, number];
  swing: number;
}

/** Swings below this are not worth showing. */
export const MIN_SWING = 0.03;

export function stakesOf(impact: MatchImpact | undefined, home: string, away: string): Stake[] {
  if (!impact) return [];
  const pick = (team: string, side: SideImpact, isHome: boolean): Stake | null => {
    let best: Stake | null = null;
    for (const key of ["champion", "europe", "relegation"] as StakeKey[]) {
      const [h, d, a] = side[key];
      const odds: [number, number, number] = isHome ? [h, d, a] : [a, d, h];
      const swing = Math.abs(odds[0] - odds[2]);
      if (!best || swing > best.swing) best = { team, key, odds, swing };
    }
    return best && best.swing >= MIN_SWING ? best : null;
  };
  return [pick(home, impact.home, true), pick(away, impact.away, false)].filter((s): s is Stake => s !== null);
}

/** How much the season turns on this game: the two teams' biggest swings added up. */
export function stakeWeight(impact: MatchImpact | undefined, home: string, away: string): number {
  return stakesOf(impact, home, away).reduce((s, x) => s + x.swing, 0);
}
