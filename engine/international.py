"""National teams: one Elo over every international since 1872, and predictions for the coming games.

Results come from github.com/martj42/international_results (public domain), fixtures from
TheSportsDB (free key). Writes site/data/international.json: upcoming games with predictions,
recent results with the prediction made before them, and the European rating table.

    python engine/international.py
"""

from __future__ import annotations

import csv
import io
import json
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression

sys.path.insert(0, str(Path(__file__).resolve().parent))

from rinvalo_engine.metrics import scores  # noqa: E402
from rinvalo_engine.model import rates_for  # noqa: E402
from rinvalo_engine.ratings import match_outcomes, score_grid  # noqa: E402

DATA = Path(__file__).resolve().parent.parent / "site" / "data"
RESULTS = "https://raw.githubusercontent.com/martj42/international_results/master/results.csv"
TSDB = "https://www.thesportsdb.com/api/v1/json/123"
# TheSportsDB competitions to follow: (league id, code, rounds to read).
COMPETITIONS = [(4490, "unl", [1, 2, 3, 4, 5, 6])]
HOME = 100.0
FIT_FROM = "2006-01-01"
KEEP_RECENT_DAYS = 60

# TheSportsDB spellings that differ from the results file.
ALIASES = {
    "N.Ireland": "Northern Ireland",
    "Bosnia-Herzegovina": "Bosnia and Herzegovina",
    "Czechia": "Czech Republic",
    "Ireland": "Republic of Ireland",
    "Rep. of Ireland": "Republic of Ireland",
    "Macedonia": "North Macedonia",
    "FYR Macedonia": "North Macedonia",
    "Turkiye": "Turkey",
    "Türkiye": "Turkey",
    "Faroe Islands": "Faroe Islands",
    "Kosovo": "Kosovo",
    "USA": "United States",
}


def k_factor(tournament: str) -> float:
    t = tournament.lower()
    if t == "fifa world cup":
        return 60
    if t in {"uefa euro", "copa américa", "african cup of nations", "afc asian cup", "gold cup", "confederations cup"}:
        return 50
    if "qualification" in t or "nations league" in t:
        return 40
    if t == "friendly":
        return 20
    return 30


def margin(gd: int) -> float:
    gd = abs(gd)
    return 1.0 if gd <= 1 else 1.5 if gd == 2 else (11 + gd) / 8


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"user-agent": "rinvalo-bot/2"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except Exception:
            if attempt == 3:
                raise
            time.sleep(4 * (attempt + 1))
    raise RuntimeError(url)


def slug(name: str) -> str:
    return "".join(c if c.isalnum() else "-" for c in name.lower()).strip("-").replace("--", "-")


def main() -> None:
    now = datetime.now(timezone.utc)
    out_path = DATA / "international.json"
    old = json.loads(out_path.read_text("utf-8")) if out_path.exists() else {"games": []}
    if "--force" not in sys.argv and old.get("updatedAt"):
        age = now - datetime.fromisoformat(old["updatedAt"].replace("Z", "+00:00"))
        # Ratings only move with results, so a fresh file is kept unless a game is about to start.
        soon = any(g["hg"] is None and timedelta(0) < datetime.fromisoformat(g["kickoff"].replace("Z", "+00:00")) - now < timedelta(hours=1) for g in old["games"])
        if age < timedelta(hours=3) and not soon:
            print("Milli maçlar: güncel, atlandı.")
            return
    rows = list(csv.DictReader(io.StringIO(get(RESULTS).decode("utf-8"))))
    rows = [r for r in rows if r["home_score"] not in ("", "NA") and r["away_score"] not in ("", "NA")]
    rows.sort(key=lambda r: r["date"])

    elo: dict[str, float] = {}
    last_game: dict[str, str] = {}
    seen = []  # [date, diff incl. home, outcome, total goals, competitive]
    for r in rows:
        h, a = r["home_team"], r["away_team"]
        rh, ra = elo.get(h, 1500.0), elo.get(a, 1500.0)
        home = 0.0 if r["neutral"] == "TRUE" else HOME
        hg, ag = int(r["home_score"]), int(r["away_score"])
        d = rh - ra + home
        if r["date"] >= FIT_FROM:
            seen.append((r["date"], d, 0 if hg > ag else 1 if hg == ag else 2, hg + ag, r["tournament"] != "Friendly"))
        exp = 1 / (1 + 10 ** (-d / 400))
        res = 1.0 if hg > ag else 0.5 if hg == ag else 0.0
        delta = k_factor(r["tournament"]) * margin(hg - ag) * (res - exp)
        elo[h], elo[a] = rh + delta, ra - delta
        last_game[h] = last_game[a] = r["date"]

    X = np.array([[s[1] / 100] for s in seen])
    y = np.array([s[2] for s in seen])
    year = np.array([int(s[0][:4]) for s in seen])
    comp = np.array([s[4] for s in seen])
    # Out-of-sample check on competitive games: fit on earlier years, score each later year.
    for test in range(now.year - 3, now.year + 1):
        tr, te = year < test, (year == test) & comp
        if te.sum() < 50:
            continue
        m = LogisticRegression(C=1.0).fit(X[tr], y[tr])
        s = scores(m.predict_proba(X[te]), y[te])
        base = np.bincount(y[tr], minlength=3) / tr.sum()
        b = scores(np.tile(base, (te.sum(), 1)), y[te])
        print(f"Milli test {test}: {int(te.sum())} maç, isabet %{s['accuracy'] * 100:.1f}, log loss {s['logloss']:.4f} (sabit oran {b['logloss']:.4f})")
    outcome = LogisticRegression(C=1.0).fit(X, y)
    goals = np.polyfit(np.abs(X[:, 0]), np.array([s[3] for s in seen], float), 1)

    def predict(h: str, a: str, neutral: bool) -> dict:
        d = elo.get(h, 1400.0) - elo.get(a, 1400.0) + (0.0 if neutral else HOME)
        p = outcome.predict_proba(np.array([[d / 100]]))[0]
        total = float(np.polyval(goals, abs(d) / 100))
        lh, la = rates_for(p, total * 0.55 if d >= 0 else total * 0.45, total * 0.45 if d >= 0 else total * 0.55, hold=1.0)
        grid = match_outcomes(score_grid(lh, la), p)
        pick = int(np.argmax(p))
        cells = sorted(((i, j, grid[i, j]) for i in range(grid.shape[0]) for j in range(grid.shape[1])), key=lambda c: -c[2])
        best = next(c for c in cells if (c[0] > c[1], c[0] == c[1], c[0] < c[1])[pick])
        return {"p": [round(float(x), 4) for x in p], "score": [int(best[0]), int(best[1])], "lh": round(lh, 2), "la": round(la, 2)}

    # Predictions are frozen at kick-off: a game keeps the last one made before it started.
    frozen = {g["id"]: g.get("pred") for g in old.get("games", [])}

    games = []
    unknown = set()
    for league, code, rounds in COMPETITIONS:
        season = json.loads(get(f"{TSDB}/lookupleague.php?id={league}"))["leagues"][0]["strCurrentSeason"]
        for rnd in rounds:
            time.sleep(2.2)
            events = json.loads(get(f"{TSDB}/eventsround.php?id={league}&r={rnd}&s={season}")).get("events") or []
            for e in events:
                h = ALIASES.get(e["strHomeTeam"], e["strHomeTeam"])
                a = ALIASES.get(e["strAwayTeam"], e["strAwayTeam"])
                for t in (h, a):
                    if t not in elo:
                        unknown.add(t)
                kick = (e.get("strTimestamp") or f"{e['dateEvent']}T00:00:00")[:19] + "Z"
                gid = f"{code}-{slug(h)}-{slug(a)}-{kick[:10]}"
                done = e.get("intHomeScore") not in (None, "") and e.get("intAwayScore") not in (None, "")
                started = datetime.fromisoformat(kick.replace("Z", "+00:00")) <= now
                if started and not done and datetime.fromisoformat(kick.replace("Z", "+00:00")) < now - timedelta(hours=3):
                    continue  # postponed or never reported
                if done and datetime.fromisoformat(kick.replace("Z", "+00:00")) < now - timedelta(days=KEEP_RECENT_DAYS):
                    continue
                pred = frozen.get(gid) if started else predict(h, a, False)
                games.append({
                    "id": gid,
                    "comp": code,
                    "round": rnd,
                    "kickoff": kick,
                    "home": h,
                    "away": a,
                    "hg": int(e["intHomeScore"]) if done else None,
                    "ag": int(e["intAwayScore"]) if done else None,
                    "pred": pred,
                })
    games.sort(key=lambda g: (g["kickoff"], g["home"]))

    europe = {r["home_team"] for r in rows if r["tournament"] in ("UEFA Euro qualification", "UEFA Nations League") and r["date"] >= "2022-01-01"}
    active = {t for t, d in last_game.items() if d >= (now - timedelta(days=730)).date().isoformat()}
    table = sorted(((t, v) for t, v in elo.items() if t in europe and t in active), key=lambda x: -x[1])
    out = {
        "updatedAt": now.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "games": games,
        "ratings": [[t, round(v)] for t, v in table],
    }
    out_path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", "utf-8")
    msg = f"Milli maçlar: {len(games)} maç, {sum(g['hg'] is None for g in games)} yaklaşan, {len(table)} Avrupa takımı."
    if unknown:
        msg += " Tanınmayan isimler: " + ", ".join(sorted(unknown))
    print(msg)


if __name__ == "__main__":
    main()
