"""Keeps what the site would otherwise forget between runs.

prediction-history.json: every prediction's 1-X-2 as it changes before kick-off (per mille),
    {fixtureId: [["2026-11-07T05:23", home, draw, away], ...]}. A new point is added only when
    some outcome moved by at least half a point.
daily.json: one entry per day (the last run of the day wins) with the season odds of every
    league and cup, [champion, europe, relegation] per mille, and every team's Elo.

    python engine/snapshot.py   (after the predictions and the season simulation)
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "site" / "data"
KEEP_DAYS = 120
MIN_MOVE = 5  # per mille


def read(name: str, fallback):
    p = DATA / name
    return json.loads(p.read_text("utf-8")) if p.exists() else fallback


def write(name: str, value) -> None:
    (DATA / name).write_text(json.dumps(value, separators=(",", ":")) + "\n", "utf-8")


def ts(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def main() -> None:
    now = datetime.now(timezone.utc)
    fixtures = read("season.json", {"fixtures": []})["fixtures"] + read("cups.json", {"fixtures": []})["fixtures"]
    preds = read("predictions.json", {"predictions": {}})["predictions"]

    hist: dict[str, list] = read("prediction-history.json", {})
    added = 0
    for f in fixtures:
        pr = preds.get(f["id"])
        if not pr or not pr.get("madeAt") or ts(pr["madeAt"]) >= ts(f["kickoff"]):
            continue
        at = pr["madeAt"][:16]
        point = [at, *(round(x * 1000) for x in pr["p"])]
        line = hist.setdefault(f["id"], [])
        if line and (line[-1][0] == at or max(abs(a - b) for a, b in zip(line[-1][1:], point[1:])) < MIN_MOVE):
            continue
        line.append(point)
        added += 1
    write("prediction-history.json", hist)

    sim = read("simulation.json", {"leagues": {}, "cups": {}})
    pm = lambda x: round(x * 1000)  # noqa: E731
    day = {
        comp: {r["team"]: [pm(r["champion"]), pm(r["europe"]), pm(r["relegation"])] for r in rows}
        for comp, rows in {**sim.get("leagues", {}), **sim.get("cups", {})}.items()
    }
    day["elo"] = {r["team"]: round(r["elo"]) for rows in read("ratings.json", {"leagues": {}})["leagues"].values() for r in rows}
    daily = read("daily.json", {"days": {}})
    daily["days"][now.date().isoformat()] = day
    daily["days"] = dict(sorted(daily["days"].items())[-KEEP_DAYS:])
    write("daily.json", daily)

    print(f"Tahmin geçmişi: {added} yeni nokta, {len(hist)} maç. Günlük özet: {len(daily['days'])} gün.")


if __name__ == "__main__":
    main()
