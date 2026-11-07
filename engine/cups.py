"""European cup predictions from one Elo scale shared by every club.

Domestic Elo ratings (engine/rinvalo_engine/ratings.py) live on a separate scale per league, so a
Süper Lig 1600 and a Premier League 1600 mean different things. Here every league game of the
nine tracked leagues and every European cup game since 2021-22 run through a single Elo. Leagues
drift apart through European results and through clubs moving between the Premier League and
the Championship; clubs from other countries are rated from their European games alone.

Reads site/data (stats, season, cups, cups-history), writes predictions for cup games that have
not kicked off into site/data/predictions.json and the cross-league table to
site/data/europe.json.

    python engine/cups.py
"""

from __future__ import annotations

import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

sys.path.insert(0, str(Path(__file__).resolve().parent))

from rinvalo_engine.data import DATA, _season_of, load_matches, load_moviodds, market_probs, two_way  # noqa: E402
from rinvalo_engine.metrics import scores  # noqa: E402
from rinvalo_engine.model import rates_for  # noqa: E402
from rinvalo_engine.ratings import match_outcomes, score_grid  # noqa: E402

VERSION = "rinvalo-europe-1"
CUPS = {"ucl", "uel", "uecl"}
HOME = 60.0  # home advantage in Elo points; finals are on neutral ground
K_LEAGUE, K_CUP = 18.0, 28.0
K_OUTSIDER = 40.0  # clubs we only see in Europe need to move faster
CARRY = 0.8  # share of a club's distance from its league mean kept into a new season
START = 1500.0
OUTSIDER_START = 1400.0  # unknown clubs from smaller leagues
FINAL_ROUND = 200

TEXT = {
    "tr": {
        "lead": "{t} Avrupa güç puanında {n} puan önde.",
        "league": "{a} ortalaması {b} ortalamasının {n} puan üstünde.",
        "even": "Güçler dengeli; hiçbir sonuç {p} üzerinde değil.",
        "neutral": "Tarafsız sahada oynanıyor.",
    },
    "en": {
        "lead": "{t} lead by {n} points on the European rating.",
        "league": "The {a} average is {n} points above the {b} average.",
        "even": "Evenly matched; no result above {p}.",
        "neutral": "Played on neutral ground.",
    },
}
LEAGUE_NAME = {
    "super-lig": "Süper Lig", "premier-league": "Premier League", "la-liga": "La Liga", "serie-a": "Serie A",
    "bundesliga": "Bundesliga", "ligue-1": "Ligue 1", "eredivisie": "Eredivisie", "primeira-liga": "Primeira Liga",
    "championship": "Championship",
}
EN_NAMES = {"bayern": "Bayern Munich"}


def read(name: str, default):
    path = DATA / name
    return json.loads(path.read_text("utf-8")) if path.exists() else default


def pct(x: float, lang: str) -> str:
    return f"%{round(x * 100)}" if lang == "tr" else f"{round(x * 100)}%"


class EuroElo:
    def __init__(self):
        self.r: dict[str, float] = {}
        self.season: dict[str, str] = {}
        self.league: dict[str, str] = {}  # last domestic league seen
        self.games: dict[str, int] = defaultdict(int)

    def league_mean(self, league: str) -> float:
        """Average of the clubs in the league's latest season (relegated clubs drop out)."""
        members = [t for t in self.r if self.league.get(t) == league]
        if not members:
            return START
        latest = max(self.season[t] for t in members)
        return float(np.mean([self.r[t] for t in members if self.season[t] == latest]))

    def get(self, team: str, season: str, league: str | None) -> float:
        if team not in self.r:
            if league:
                # A newcomer to a tracked league: just below that league's average.
                self.r[team] = self.league_mean(league) - 80 if any(self.league.get(t) == league for t in self.r) else START
            else:
                self.r[team] = OUTSIDER_START
            self.season[team] = season
        elif self.season[team] != season:
            base = self.league_mean(self.league[team]) if team in self.league else OUTSIDER_START
            self.r[team] = base + CARRY * (self.r[team] - base)
            self.season[team] = season
        if league:
            self.league[team] = league
        return self.r[team]

    def expected(self, rh: float, ra: float, home: float) -> float:
        return 1 / (1 + 10 ** ((ra - (rh + home)) / 400))

    def update(self, h: str, a: str, hg: int, ag: int, season: str, league: str | None, home: float, k: float) -> float:
        rh, ra = self.get(h, season, league), self.get(a, season, league)
        diff = rh - ra + home
        exp = self.expected(rh, ra, home)
        res = 1.0 if hg > ag else 0.5 if hg == ag else 0.0
        gd = abs(hg - ag)
        margin = 1.0 if gd <= 1 else 1.0 + float(np.log(gd))
        kh = K_OUTSIDER if h not in self.league else k
        ka = K_OUTSIDER if a not in self.league else k
        self.r[h] = rh + kh * margin * (res - exp)
        self.r[a] = ra - ka * margin * (res - exp)
        self.games[h] += 1
        self.games[a] += 1
        return diff


def timeline(now: pd.Timestamp) -> pd.DataFrame:
    """League and cup results, oldest first."""
    league = load_matches()[["league", "season", "date", "home", "away", "hg", "ag"]].assign(kind="league", round=0)
    hist = pd.DataFrame(read("cups-history.json", []), columns=["league", "season", "date", "home", "away", "hg", "ag"]).assign(kind="cup", round=0)
    cur = [
        {"league": f["league"], "season": _season_of(f["kickoff"]), "date": f["kickoff"][:10], "home": f["home"], "away": f["away"],
         "hg": f["hg"], "ag": f["ag"], "kind": "cup", "round": f["round"]}
        for f in read("cups.json", {"fixtures": []})["fixtures"]
        if f["status"] == "finished" and f["hg"] is not None
    ]
    df = pd.concat([league, hist, pd.DataFrame(cur)], ignore_index=True)
    df["date"] = pd.to_datetime(df["date"])
    df = df[df["date"] <= now]
    # League games first on a shared day, so a cup game sees that weekend's form.
    df["order"] = (df["kind"] == "cup").astype(int)
    return df.sort_values(["date", "order"]).reset_index(drop=True)


def main() -> None:
    now = pd.Timestamp(os.environ.get("RINVALO_NOW") or datetime.now(timezone.utc))
    now = now.tz_convert(None) if now.tzinfo else now
    df = timeline(now)
    elo = EuroElo()

    # Walk forward: every cup game is rated before its result is known, for the outcome model and backtest.
    seen_d, seen_y, seen_season, seen_goals = [], [], [], []
    for r in df.itertuples():
        hg, ag = int(r.hg), int(r.ag)
        if r.kind == "league":
            elo.update(r.home, r.away, hg, ag, r.season, r.league, HOME, K_LEAGUE)
        else:
            home = 0.0 if r.round == FINAL_ROUND else HOME
            d = elo.update(r.home, r.away, hg, ag, r.season, None, home, K_CUP)
            seen_d.append(d)
            seen_y.append(0 if hg > ag else 1 if hg == ag else 2)
            seen_season.append(r.season)
            seen_goals.append(hg + ag)

    X = np.array(seen_d)[:, None] / 100
    y = np.array(seen_y)
    seasons = np.array(seen_season)
    # Out-of-sample check: fit on earlier seasons, score the last two.
    for test in sorted(set(seasons))[-2:]:
        train = seasons < test
        if train.sum() > 200 and (seasons == test).sum():
            m = LogisticRegression(C=1.0).fit(X[train], y[train])
            s = scores(m.predict_proba(X[seasons == test]), y[seasons == test])
            print(f"Kupa testi {test}: {int((seasons == test).sum())} maç, isabet %{s['accuracy'] * 100:.1f}, log loss {s['logloss']:.4f}")
    outcome = LogisticRegression(C=1.0).fit(X, y)
    # Mismatches produce more goals: expected total grows with the rating gap.
    goals = np.polyfit(np.abs(X[:, 0]), np.array(seen_goals, float), 1)

    names = read("team-names.json", {})
    names.update({k: v[0] for k, v in read("cup-teams.json", {}).items()})
    store = read("predictions.json", {"model": "", "predictions": {}})
    preds = store["predictions"]
    made_at = now.tz_localize("UTC").isoformat().replace("+00:00", "Z")
    season = _season_of(now.isoformat())
    means = {lg: elo.league_mean(lg) for lg in LEAGUE_NAME}

    movi = load_moviodds()
    refreshed = 0
    for f in read("cups.json", {"fixtures": []})["fixtures"]:
        kick = pd.Timestamp(f["kickoff"]).tz_convert(None)
        if not ((f["status"] == "scheduled" and kick > now) or f["status"] == "postponed"):
            continue
        h, a = f["home"], f["away"]
        rh, ra = elo.get(h, season, None), elo.get(a, season, None)
        home = 0.0 if f["round"] == FINAL_ROUND else HOME
        p = outcome.predict_proba(np.array([[(rh - ra + home) / 100]]))[0]
        total = float(np.polyval(goals, abs(rh - ra + home) / 100))
        lh, la = rates_for(p, total * 0.55, total * 0.45, hold=1.0)
        grid = match_outcomes(score_grid(lh, la), p)
        cells = sorted(((i, j, grid[i, j]) for i in range(grid.shape[0]) for j in range(grid.shape[1])), key=lambda c: -c[2])
        pick = int(np.argmax(p))
        in_pick = next(c for c in cells if (c[0] > c[1], c[0] == c[1], c[0] < c[1])[pick])
        r4 = lambda x: round(float(x), 4)  # noqa: E731

        def reasons(lang: str) -> list[str]:
            T = TEXT[lang]
            nm = lambda t: (EN_NAMES.get(t) if lang == "en" else None) or names.get(t, t)  # noqa: E731
            out = []
            fav = {0: h, 2: a}.get(pick)
            if fav and abs(rh - ra) >= 40 and (fav == h) == (rh > ra):
                out.append(T["lead"].format(t=nm(fav), n=round(abs(rh - ra))))
            lh_, la_ = elo.league.get(h), elo.league.get(a)
            if lh_ and la_ and lh_ != la_ and abs(means[lh_] - means[la_]) >= 25:
                hi, lo = (lh_, la_) if means[lh_] > means[la_] else (la_, lh_)
                out.append(T["league"].format(a=LEAGUE_NAME[hi], b=LEAGUE_NAME[lo], n=round(abs(means[lh_] - means[la_]))))
            if pick == 1:
                out.append(T["even"].format(p=pct(max(p), lang)))
            if home == 0.0:
                out.append(T["neutral"])
            return out

        preds[f["id"]] = {
            "fixtureId": f["id"],
            "madeAt": made_at,
            "model": VERSION,
            "lh": round(lh, 3),
            "la": round(la, 3),
            "p": [r4(x) for x in p],
            "score": [int(in_pick[0]), int(in_pick[1])],
            "top": [[int(i), int(j), r4(v)] for i, j, v in cells[:6]],
            "over25": r4(grid[np.add.outer(range(grid.shape[0]), range(grid.shape[1])) > 2].sum()),
            "btts": r4(grid[1:, 1:].sum()),
            "grid": [[r4(v) for v in row[:6]] for row in grid[:6]],
            "reasons": reasons("tr"),
            "reasonsEn": reasons("en"),
            # MoviOdds prices, as the market's view; the cup model never uses them.
            "market": [r4(x) for x in market_probs(*mo[:3])] if (mo := movi.get(f["id"])) else None,
            "marketOver25": r4(v) if mo and (v := two_way(mo[3], mo[4])) is not None else None,
            "marketBtts": r4(v) if mo and (v := two_way(mo[5], mo[6])) is not None else None,
        }
        refreshed += 1

    (DATA / "predictions.json").write_text(json.dumps(store, ensure_ascii=False, separators=(",", ":")) + "\n", "utf-8")

    # Cross-league table: league averages and the strongest clubs on the shared scale.
    active = {t for t, s in elo.season.items() if s >= _season_of((now - pd.Timedelta(days=400)).isoformat())}
    clubs = sorted(((t, v) for t, v in elo.r.items() if t in active), key=lambda x: -x[1])[:40]
    europe = {
        "leagues": sorted(({"league": lg, "rating": round(v, 1)} for lg, v in means.items()), key=lambda x: -x["rating"]),
        "clubs": [{"team": t, "rating": round(v, 1), "league": elo.league.get(t)} for t, v in clubs],
        # Every league club on the shared scale and the fitted outcome model, so the comparison page
        # can price any pairing in the browser: p = softmax(coef * (rh - ra + home) / 100 + intercept).
        "ratings": {t: round(v, 1) for t, v in elo.r.items() if t in active and elo.league.get(t) in LEAGUE_NAME},
        "model": {
            "coef": [round(float(c[0]), 5) for c in outcome.coef_],
            "intercept": [round(float(c), 5) for c in outcome.intercept_],
            "classes": [int(c) for c in outcome.classes_],
            "home": HOME,
        },
    }
    (DATA / "europe.json").write_text(json.dumps(europe, ensure_ascii=False, separators=(",", ":")) + "\n", "utf-8")
    print(f"{refreshed} kupa tahmini ({VERSION}); lig ortalamaları: " + ", ".join(f"{x['league']} {x['rating']:.0f}" for x in europe["leagues"]))


if __name__ == "__main__":
    main()
