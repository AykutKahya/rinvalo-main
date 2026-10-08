import assert from "node:assert/strict";
import { test } from "node:test";
import { fmt } from "./format";
import { alternates, switchPath } from "./i18n";

test("language switch keeps the page", () => {
  assert.equal(switchPath("/mac/galatasaray-corum", "en"), "/en/match/galatasaray-corum");
  assert.equal(switchPath("/en/match/galatasaray-corum", "tr"), "/mac/galatasaray-corum");
  assert.equal(switchPath("/analiz/guc", "en"), "/en/analysis/power");
  assert.equal(switchPath("/en/leagues", "tr"), "/ligler");
  assert.equal(switchPath("/lig/la-liga", "en"), "/en/league/la-liga");
  assert.equal(switchPath("/", "en"), "/en");
  assert.equal(switchPath("/en", "tr"), "/");
});

test("hreflang alternates point at both languages", () => {
  assert.deepEqual(alternates("en", "team", "/bayern").languages, { tr: "/takim/bayern", en: "/en/team/bayern", "x-default": "/takim/bayern" });
  assert.equal(alternates("tr", "home").canonical, "/");
});

test("percentages follow each language", () => {
  assert.equal(fmt("tr").pct(0.613), "%61");
  assert.equal(fmt("en").pct(0.613), "61%");
  assert.equal(fmt("tr").pct(0.6134, 1), "%61,3");
});
