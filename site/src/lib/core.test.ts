import assert from "node:assert/strict";
import { test } from "node:test";
import { parseOpenfootball } from "../../scripts/sources/openfootball";
import { fit, outcomeOf, pickOf, predict, type ModelMatch } from "./model";
import { simulateLeague } from "./simulate";
import { buildTable } from "./table";
import { resolveTeam } from "./teams";
import { LEAGUES } from "./leagues";
import type { Fixture } from "./types";

test("every source spelling resolves to one slug", () => {
  const cases: [string, string][] = [
    ["Man United", "man-united"],
    ["Manchester United FC", "man-united"],
    ["Fenerbahce", "fenerbahce"],
    ["Fenerbahçe", "fenerbahce"],
    ["Buyuksehyr", "basaksehir"],
    ["İstanbul Başakşehir", "basaksehir"],
    ["FC Internazionale Milano", "inter"],
    ["Bayer 04 Leverkusen", "leverkusen"],
    ["Real Racing Club de Santander", "racing"],
    ["Çorum", "corum"],
  ];
  for (const [name, slug] of cases) assert.equal(resolveTeam(name), slug, name);
  assert.equal(resolveTeam("Bilinmeyen Kulüp"), null);
});

function season(): ModelMatch[] {
  const out: ModelMatch[] = [];
  const teams = ["a", "b", "c", "d"];
  let day = 1;
  for (let r = 0; r < 6; r++) {
    for (const h of teams) {
      for (const aw of teams) {
        if (h === aw) continue;
        // "a" is clearly the strongest side.
        const hg = h === "a" ? 3 : 1;
        const ag = aw === "a" ? 2 : 1;
        out.push({ date: `2025-0${1 + (day % 8)}-${String(1 + (day % 27)).padStart(2, "0")}`, home: h, away: aw, hg, ag });
        day++;
      }
    }
  }
  return out;
}

test("model probabilities are valid and favour the stronger team", () => {
  const model = fit(season(), new Date("2025-10-01"), new Set(["a", "b", "c", "d"]));
  const p = predict(model, "a", "b", "x", new Date());
  assert.ok(Math.abs(p.p[0] + p.p[1] + p.p[2] - 1) < 1e-3);
  assert.ok(p.p[0] > p.p[2]);
  assert.equal(pickOf(p.p), 0);
  assert.ok(p.score[0] > p.score[1], "predicted score agrees with predicted outcome");
  assert.ok(Number.isFinite(p.lh) && Number.isFinite(p.la));
});

test("a team with no history still gets a prediction", () => {
  const model = fit(season(), new Date("2025-10-01"), new Set(["a", "b", "c", "d"]));
  const p = predict(model, "newcomer", "a", "x", new Date());
  assert.ok(p.p[2] > p.p[0]);
});

test("outcome helpers", () => {
  assert.equal(outcomeOf(2, 1), 0);
  assert.equal(outcomeOf(1, 1), 1);
  assert.equal(outcomeOf(0, 3), 2);
});

const fx = (id: string, home: string, away: string, hg: number | null, ag: number | null, kickoff: string): Fixture => ({
  id,
  league: "super-lig",
  round: 1,
  kickoff,
  home,
  away,
  venue: null,
  status: hg === null ? "scheduled" : "finished",
  hg,
  ag,
  source: null,
});

test("table counts points, goal difference and form", () => {
  const t = buildTable([fx("1", "a", "b", 2, 0, "2026-08-01T18:00:00Z"), fx("2", "b", "c", 1, 1, "2026-08-08T18:00:00Z"), fx("3", "c", "a", 3, 1, "2026-08-15T18:00:00Z")]);
  assert.deepEqual(
    t.map((r) => [r.team, r.points]),
    [
      ["c", 4],
      ["a", 3],
      ["b", 1],
    ],
  );
  assert.deepEqual(t.find((r) => r.team === "a")!.form, ["G", "M"]);
});

test("season simulation sums to one champion per run", () => {
  const league = LEAGUES[0];
  const fixtures = [fx("ab", "a", "b", null, null, "2026-11-01T18:00:00Z"), fx("ba", "b", "a", null, null, "2026-11-08T18:00:00Z")];
  const pred = (id: string) => ({ fixtureId: id, madeAt: "", model: "", lh: 1.5, la: 1.0, p: [0.5, 0.25, 0.25] as [number, number, number], score: [1, 0] as [number, number], top: [], over25: 0.5, btts: 0.5, grid: [] });
  const { outlook, impact } = simulateLeague(league, fixtures, { ab: pred("ab"), ba: pred("ba") }, 2000, new Set(["ab"]));
  const total = outlook.reduce((s, r) => s + r.champion, 0);
  assert.ok(Math.abs(total - 1) < 0.002);
  // Winning the first game must raise a's title odds above losing it.
  const a = impact.ab.home.champion;
  assert.ok(a[0] > a[2]);
});

test("openfootball lines with and without kick-off time are parsed", () => {
  const text = [
    "▪ Matchday 1",
    "  Fri Aug 28 2026",
    "    20:30  FC Bayern München       v VfB Stuttgart            5-1 (1-0)",
    "           1. FSV Mainz 05         v SC Paderborn 07          0-0",
    "    15:30  RB Leipzig              v Borussia Mönchengladbach",
  ].join("\n");
  assert.deepEqual(parseOpenfootball(text), [
    { id: "bayern-stuttgart", hg: 5, ag: 1 },
    { id: "mainz-paderborn", hg: 0, ag: 0 },
  ]);
});
