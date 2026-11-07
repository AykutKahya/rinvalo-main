import type { Fixture } from "./types";

export interface TableRow {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
  /** Last five results, oldest first. */
  form: ("G" | "B" | "M")[];
}

export function emptyRow(team: string): TableRow {
  return { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, form: [] };
}

/** Points, goal difference, goals scored; then by name, unless `byName` is off (the simulation draws lots). */
export function compareRows(a: TableRow, b: TableRow, byName = true): number {
  return b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || (byName ? a.team.localeCompare(b.team) : 0);
}

/** How clubs level on points are split: goal difference, or first the games between them. */
export type Tiebreak = "gd" | "h2h";

/** Leagues that look at the games between the level clubs first. */
export const H2H_LEAGUES = new Set(["super-lig", "la-liga", "serie-a"]);
export const tiebreakOf = (league: string): Tiebreak => (H2H_LEAGUES.has(league) ? "h2h" : "gd");

export type Score = { home: string; away: string; hg: number; ag: number };

/**
 * Orders rows by points, then within each group level on points by `rule`. Head-to-head counts only
 * once the level clubs have all played each other home and away, as the leagues apply it; until
 * then (and for "gd") goal difference and goals decide. `tie` breaks what is still level.
 */
export function rankRows(rows: TableRow[], games: Score[], rule: Tiebreak, tie: (a: TableRow, b: TableRow) => number = (a, b) => a.team.localeCompare(b.team)): TableRow[] {
  const general = (a: TableRow, b: TableRow) => compareRows(a, b, false) || tie(a, b);
  const sorted = [...rows].sort((a, b) => b.points - a.points || general(a, b));
  if (rule !== "h2h") return sorted;
  const out: TableRow[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i + 1;
    while (j < sorted.length && sorted[j].points === sorted[i].points) j++;
    const group = sorted.slice(i, j);
    i = j;
    if (group.length < 2) {
      out.push(...group);
      continue;
    }
    const inGroup = new Set(group.map((r) => r.team));
    const mutual = games.filter((g) => inGroup.has(g.home) && inGroup.has(g.away));
    // Every pair home and away: n·(n−1) games.
    if (mutual.length < group.length * (group.length - 1)) {
      out.push(...group);
      continue;
    }
    const mini = new Map(group.map((r) => [r.team, { pts: 0, gd: 0 }]));
    for (const g of mutual) {
      const h = mini.get(g.home)!;
      const a = mini.get(g.away)!;
      h.gd += g.hg - g.ag;
      a.gd += g.ag - g.hg;
      if (g.hg > g.ag) h.pts += 3;
      else if (g.hg < g.ag) a.pts += 3;
      else {
        h.pts++;
        a.pts++;
      }
    }
    out.push(...group.sort((a, b) => mini.get(b.team)!.pts - mini.get(a.team)!.pts || mini.get(b.team)!.gd - mini.get(a.team)!.gd || general(a, b)));
  }
  return out;
}

/** Standings from finished fixtures. `teams` makes sure clubs without a game still appear. */
export function buildTable(fixtures: Fixture[], teams: Iterable<string> = [], rule: Tiebreak = "gd"): TableRow[] {
  const rows = new Map<string, TableRow>();
  const row = (t: string) => {
    if (!rows.has(t)) rows.set(t, emptyRow(t));
    return rows.get(t)!;
  };
  for (const t of teams) row(t);

  const finished = fixtures
    .filter((f) => f.status === "finished" && f.hg !== null && f.ag !== null)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  for (const f of finished) {
    const h = row(f.home);
    const a = row(f.away);
    const hg = f.hg!;
    const ag = f.ag!;
    h.played++;
    a.played++;
    h.gf += hg;
    h.ga += ag;
    a.gf += ag;
    a.ga += hg;
    if (hg > ag) {
      h.won++;
      a.lost++;
      h.points += 3;
      h.form.push("G");
      a.form.push("M");
    } else if (hg < ag) {
      a.won++;
      h.lost++;
      a.points += 3;
      h.form.push("M");
      a.form.push("G");
    } else {
      h.drawn++;
      a.drawn++;
      h.points++;
      a.points++;
      h.form.push("B");
      a.form.push("B");
    }
  }
  for (const r of rows.values()) r.form = r.form.slice(-5);
  return rankRows([...rows.values()], finished.map((f) => ({ home: f.home, away: f.away, hg: f.hg!, ag: f.ag! })), rule);
}
