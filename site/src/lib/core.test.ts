import assert from "node:assert/strict";
import { test } from "node:test";
import { parseOpenfootball } from "../../scripts/sources/openfootball";
import { fit, outcomeOf, pickOf, predict, type ModelMatch } from "./model";
import { liveOdds, minutePlayed } from "./live";
import { simulateLeague, tieOdds } from "./simulate";
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

test("if-they-win odds never fall below if-they-draw, nor those below if-they-lose", () => {
  const league = { ...LEAGUES[0], zones: { europe: 2, relegation: 1 } };
  const teams = ["a", "b", "c", "d"];
  const fixtures = teams.flatMap((h, i) => teams.filter((a) => a !== h).map((a, j) => fx(`${h}${a}`, h, a, null, null, `2026-11-${String(1 + i * 3 + j).padStart(2, "0")}T18:00:00Z`)));
  const pred = (id: string) => ({ fixtureId: id, madeAt: "", model: "", lh: 1.3, la: 1.1, p: [0.45, 0.27, 0.28] as [number, number, number], score: [1, 0] as [number, number], top: [], over25: 0.5, btts: 0.5, grid: [] });
  const preds = Object.fromEntries(fixtures.map((f) => [f.id, pred(f.id)]));
  const { impact } = simulateLeague(league, fixtures, preds, 1500, new Set(fixtures.map((f) => f.id)));
  for (const m of Object.values(impact)) {
    const [hw, hd, hl] = m.home.champion;
    assert.ok(hw >= hd && hd >= hl, `home ${hw} ${hd} ${hl}`);
    const [aw, ad, al] = m.away.champion; // home win, draw, away win
    assert.ok(al >= ad && ad >= aw, `away ${aw} ${ad} ${al}`);
    const [rw, rd, rl] = m.home.relegation;
    assert.ok(rw <= rd && rd <= rl, `relegation ${rw} ${rd} ${rl}`);
  }
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

test("a 3-0 first-leg win makes going through very likely", () => {
  const p = { fixtureId: "x", madeAt: "", model: "", lh: 1.3, la: 1.3, p: [0.4, 0.25, 0.35] as [number, number, number], score: [1, 1] as [number, number], top: [], over25: 0.5, btts: 0.5, grid: [] };
  const legs = [
    { home: "a", away: "b", status: "finished", hg: 3, ag: 0 },
    { home: "b", away: "a", status: "scheduled", hg: null, ag: null, p },
  ];
  const odds = tieOdds(legs, "a", 4000)!;
  assert.ok(odds > 0.9 && odds < 1);
});

test("live odds: a two-goal lead late on is nearly safe, level at kick-off matches the pre-match model", () => {
  const late = liveOdds(1.5, 1.2, 2, 0, 85);
  assert.ok(late[0] > 0.97);
  const start = liveOdds(1.5, 1.2, 0, 0, 0);
  assert.ok(start[0] > start[2] && Math.abs(start.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.equal(minutePlayed("2026-10-10T18:00:00Z", Date.parse("2026-10-10T18:50:00Z")), 45);
  assert.equal(minutePlayed("2026-10-10T18:00:00Z", Date.parse("2026-10-10T19:30:00Z")), 75);
});

test("head-to-head splits clubs level on points once they have met home and away", () => {
  // c tops the table; a and b both have 4 points, b the better goal difference, a the better record between them.
  const games = [
    fx("1", "a", "b", 1, 0, "2026-08-01T18:00:00Z"),
    fx("2", "b", "a", 0, 0, "2026-08-08T18:00:00Z"),
    fx("3", "b", "c", 5, 0, "2026-08-15T18:00:00Z"),
    fx("4", "c", "a", 1, 0, "2026-08-22T18:00:00Z"),
    fx("5", "a", "c", 0, 1, "2026-08-29T18:00:00Z"),
    fx("6", "c", "b", 1, 0, "2026-09-05T18:00:00Z"),
  ];
  assert.deepEqual(buildTable(games, [], "gd").map((r) => r.team), ["c", "b", "a"]);
  assert.deepEqual(buildTable(games, [], "h2h").map((r) => r.team), ["c", "a", "b"]);
});
