"""Point-in-time match features.

Matches are replayed in date order. Every feature row for a match is built from the state
*before* that match, then the match result is applied. Upcoming fixtures are featurised from
the final state, so training rows and live predictions are computed by the same code.
"""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from .data import market_probs
from .ratings import Elo, Strengths, fit_strengths, outcome_probs, score_grid

DERBIES = {
    frozenset(p)
    for p in [
        ("galatasaray", "fenerbahce"), ("galatasaray", "besiktas"), ("fenerbahce", "besiktas"),
        ("trabzonspor", "fenerbahce"), ("trabzonspor", "galatasaray"), ("trabzonspor", "besiktas"),
        ("man-city", "man-united"), ("arsenal", "tottenham"), ("liverpool", "everton"),
        ("liverpool", "man-united"), ("arsenal", "chelsea"), ("chelsea", "tottenham"),
        ("real-madrid", "barcelona"), ("real-madrid", "atletico"), ("sevilla", "betis"), ("athletic", "sociedad"),
        ("inter", "milan"), ("roma", "lazio"), ("juventus", "torino"), ("juventus", "inter"),
        ("dortmund", "schalke"), ("bayern", "dortmund"), ("hamburg", "werder"),
        ("psg", "marseille"), ("lyon", "saint-etienne"), ("marseille", "lyon"), ("nice", "monaco"),
        ("ajax", "feyenoord"), ("ajax", "psv"), ("feyenoord", "psv"),
        ("benfica", "sporting"), ("benfica", "porto"), ("porto", "sporting"), ("braga", "guimaraes"),
        ("sheffield-united", "sheffield-wednesday"), ("birmingham", "west-brom"), ("cardiff", "swansea"),
        ("bristol-city", "cardiff"), ("millwall", "west-ham"),
    ]
}

ZONES = {  # (europe or promotion places, relegation places)
    "super-lig": (4, 4), "premier-league": (4, 3), "la-liga": (4, 3), "serie-a": (4, 3), "bundesliga": (4, 2),
    "ligue-1": (4, 2), "eredivisie": (3, 2), "primeira-liga": (3, 2), "championship": (2, 3),
}

FEATURES = [
    "elo_diff", "elo_p",
    "dc_ph", "dc_pd", "dc_pa", "dc_lh", "dc_la",
    "xq_ph", "xq_pd", "xq_pa", "xq_lh", "xq_la",
    "ppg5_h", "ppg5_a", "ppg10_h", "ppg10_a", "ppg20_h", "ppg20_a",
    "gd10_h", "gd10_a", "xgd10_h", "xgd10_a", "xtrend_h", "xtrend_a",
    "venue_ppg_h", "venue_ppg_a",
    "rest_h", "rest_a", "n_h", "n_a",
    "pos_h", "pos_a", "gap_top_h", "gap_top_a", "gap_eu_h", "gap_eu_a", "gap_rel_h", "gap_rel_a", "left",
    "derby",
]


@dataclass
class TeamLog:
    results: deque = field(default_factory=lambda: deque(maxlen=20))  # (points, gf, ga, xgf, xga, at_home)
    last_date: pd.Timestamp | None = None


class Engine:
    def __init__(self, shot_coef: tuple[float, float], refit_days: int = 7):
        self.shot_coef = shot_coef
        self.refit_days = refit_days
        self.elo: dict[str, Elo] = defaultdict(Elo)
        self.logs: dict[str, TeamLog] = defaultdict(TeamLog)
        self.table: dict[tuple[str, str], dict[str, list[float]]] = defaultdict(dict)  # (league, season) -> team -> [pts, played]
        self.history: dict[str, list[tuple]] = defaultdict(list)  # league -> (date, season, h, a, hg, ag, xh, xa)
        self.models: dict[str, tuple[pd.Timestamp, Strengths, Strengths]] = {}
        self.season_teams: dict[tuple[str, str], set[str]] = defaultdict(set)

    # ----- quality proxy -----
    def quality(self, r) -> tuple[float, float]:
        """xG when published, otherwise an xG-like value from shots on/off target."""
        if pd.notna(r.get("hxg")) and pd.notna(r.get("axg")):
            return float(r["hxg"]), float(r["axg"])
        if pd.notna(r.get("hst")) and pd.notna(r.get("hs")):
            a, b = self.shot_coef
            return a * r["hst"] + b * max(r["hs"] - r["hst"], 0), a * r["ast"] + b * max(r["as_"] - r["ast"], 0)
        return float(r["hg"]), float(r["ag"])

    # ----- component models -----
    def strengths(self, league: str, season: str, date: pd.Timestamp) -> tuple[Strengths, Strengths]:
        cached = self.models.get(league)
        if cached and (date - cached[0]).days < self.refit_days:
            return cached[1], cached[2]
        hist = self.history[league]
        prev = _prev_season(season)
        established = self.season_teams[(league, prev)] or self.season_teams[(league, season)]
        if not hist:
            s = Strengths(0.3, 0.25, {}, {}, (-0.22, -0.18))
            self.models[league] = (date, s, s)
            return s, s
        arr = list(zip(*hist))
        age = np.array([(date - d).days for d in arr[0]], dtype=float)
        h, a = np.array(arr[2]), np.array(arr[3])
        goals = fit_strengths(h, a, np.array(arr[4], float), np.array(arr[5], float), age, established)
        # Shot quality moves faster than results, so it gets a shorter memory.
        qual = fit_strengths(h, a, np.array(arr[6], float), np.array(arr[7], float), age, established, half_life=150)
        self.models[league] = (date, goals, qual)
        return goals, qual

    # ----- features -----
    def features(self, league: str, season: str, date: pd.Timestamp, h: str, a: str) -> dict:
        f: dict[str, float] = {}
        elo = self.elo[league]
        rh, ra = elo.get(h, season), elo.get(a, season)
        f["elo_diff"] = rh - ra
        f["elo_p"] = elo.expected(rh, ra)

        goals, qual = self.strengths(league, season, date)
        for prefix, model in (("dc", goals), ("xq", qual)):
            lh, la = model.rates(h, a)
            p = outcome_probs(score_grid(lh, la))
            f[f"{prefix}_ph"], f[f"{prefix}_pd"], f[f"{prefix}_pa"] = p
            f[f"{prefix}_lh"], f[f"{prefix}_la"] = lh, la

        for side, team, venue in (("h", h, True), ("a", a, False)):
            log = self.logs[team]
            res = list(log.results)
            for n in (5, 10, 20):
                last = res[-n:]
                f[f"ppg{n}_{side}"] = np.mean([r[0] for r in last]) if last else np.nan
            last10 = res[-10:]
            f[f"gd10_{side}"] = np.mean([r[1] - r[2] for r in last10]) if last10 else np.nan
            f[f"xgd10_{side}"] = np.mean([r[3] - r[4] for r in last10]) if last10 else np.nan
            x5 = [r[3] - r[4] for r in res[-5:]]
            x20 = [r[3] - r[4] for r in res[-20:]]
            f[f"xtrend_{side}"] = (np.mean(x5) - np.mean(x20)) if x5 else np.nan
            ven = [r[0] for r in res if r[5] == venue][-10:]
            f[f"venue_ppg_{side}"] = np.mean(ven) if ven else np.nan
            f[f"rest_{side}"] = min((date - log.last_date).days, 21) if log.last_date is not None else 21

        table = self.table[(league, season)]
        teams = self.season_teams[(league, season)] | {h, a}
        size = max(len(teams), 18)
        eu, rel = ZONES.get(league, (4, 3))
        ranked = sorted(teams, key=lambda t: -table.get(t, [0, 0])[0])
        pts = [table.get(t, [0, 0])[0] for t in ranked]
        played = [table.get(t, [0, 0])[1] for t in ranked]
        games = 2 * (size - 1)
        f["left"] = 1 - (np.mean(played) / games if played else 0)
        for side, team in (("h", h), ("a", a)):
            p = table.get(team, [0, 0])[0]
            f[f"pos_{side}"] = (ranked.index(team) + 1) / size
            f[f"gap_top_{side}"] = (pts[0] - p) if pts else 0
            f[f"gap_eu_{side}"] = p - (pts[eu - 1] if len(pts) >= eu else 0)
            f[f"gap_rel_{side}"] = p - (pts[size - rel] if len(pts) > size - rel else 0)
            f[f"n_{side}"] = table.get(team, [0, 0])[1]
        f["derby"] = 1.0 if frozenset((h, a)) in DERBIES else 0.0
        return f

    def apply(self, r) -> None:
        league, season, date, h, a = r["league"], r["season"], r["date"], r["home"], r["away"]
        hg, ag = int(r["hg"]), int(r["ag"])
        xh, xa = self.quality(r)
        self.elo[league].update(h, a, hg, ag, season)
        ph = 3 if hg > ag else 1 if hg == ag else 0
        pa = 3 if ag > hg else 1 if hg == ag else 0
        self.logs[h].results.append((ph, hg, ag, xh, xa, True))
        self.logs[a].results.append((pa, ag, hg, xa, xh, False))
        self.logs[h].last_date = date
        self.logs[a].last_date = date
        t = self.table[(league, season)]
        for team, p in ((h, ph), (a, pa)):
            row = t.setdefault(team, [0, 0])
            row[0] += p
            row[1] += 1
        self.season_teams[(league, season)].update((h, a))
        self.history[league].append((date, season, h, a, hg, ag, xh, xa))


def _prev_season(season: str) -> str:
    y = int(season[:4]) - 1
    return f"{y}-{str(y + 1)[2:]}"


def fit_shot_coef(df: pd.DataFrame, seasons: list[str]) -> tuple[float, float]:
    """Goals per shot on target and per shot off target, from the given (pre-test) seasons."""
    d = df[df["season"].isin(seasons) & df["hst"].notna()]
    x = np.concatenate([np.c_[d["hst"], (d["hs"] - d["hst"]).clip(lower=0)], np.c_[d["ast"], (d["as_"] - d["ast"]).clip(lower=0)]])
    y = np.concatenate([d["hg"], d["ag"]])
    coef, *_ = np.linalg.lstsq(x, y, rcond=None)
    return float(coef[0]), float(coef[1])


def build_training(df: pd.DataFrame, engine: Engine) -> pd.DataFrame:
    rows = []
    for r in df.to_dict("records"):
        f = engine.features(r["league"], r["season"], r["date"], r["home"], r["away"])
        f.update(league=r["league"], season=r["season"], date=r["date"], home=r["home"], away=r["away"],
                 hg=r["hg"], ag=r["ag"], outcome=0 if r["hg"] > r["ag"] else 1 if r["hg"] == r["ag"] else 2)
        if pd.notna(r.get("oh")) and pd.notna(r.get("oa")):
            f["mk_ph"], f["mk_pd"], f["mk_pa"] = market_probs(r["oh"], r["od"], r["oa"])
        if pd.notna(r.get("ch")) and pd.notna(r.get("ca")):
            f["ck_ph"], f["ck_pd"], f["ck_pa"] = market_probs(r["ch"], r["cd"], r["ca"])
        rows.append(f)
        engine.apply(r)
    return pd.DataFrame(rows)
