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

export function compareRows(a: TableRow, b: TableRow): number {
  return b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || a.team.localeCompare(b.team);
}

/** Standings from finished fixtures. `teams` makes sure clubs without a game still appear. */
export function buildTable(fixtures: Fixture[], teams: Iterable<string> = []): TableRow[] {
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
  return [...rows.values()].sort(compareRows);
}
