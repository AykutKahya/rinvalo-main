"""Produce Rinvalo predictions for every match that has not kicked off.

Reads site/data (fixtures, stats, upcoming odds), writes site/data/predictions.json and
site/data/market.json. Predictions of matches that already started are never touched: the
last pre-kick-off prediction stays frozen and is what the accuracy page grades.

    python engine/predict.py
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from rinvalo_engine.data import DATA, load_fixtures, load_matches, load_upcoming_odds, market_probs  # noqa: E402
from rinvalo_engine.data import _season_of as season_of  # noqa: E402
from rinvalo_engine.features import Engine, build_training, fit_shot_coef  # noqa: E402
from rinvalo_engine.metrics import confidence  # noqa: E402
from rinvalo_engine.model import VERSION, fit, rates_for  # noqa: E402
from rinvalo_engine.ratings import Elo, Strengths, score_grid  # noqa: E402

# Same exceptions as EN_NAMES in site/src/lib/teams.ts.
EN_NAMES = {"bayern": "Bayern Munich"}

# Plain-language explanations in both site languages. {t}/{o} are team names.
TEXT = {
    "tr": {
        "outcome": ["ev sahibi", "beraberlik", "deplasman"],
        "elo": "{t} güç puanında {n} puan önde.",
        "form": "Son 5 maç: {t} maç başı {a} puan, {o} {b}.",
        "xg": "Son 10 maç xG farkı: {t} {a}, {o} {b}.",
        "home": "{t} iç sahada maç başı {a} puan.",
        "away": "{t} deplasmanda maç başı {a} puan.",
        "rest": "{tired} {n} gün önce maç oynadı; {fresh} daha dinlenmiş.",
        "even": "Güçler dengeli; hiçbir sonuç {p} üzerinde değil.",
        "derby": "Derbi maçı.",
        "agree": "Piyasa da {x} tarafında ({p}).",
        "differ": "Piyasa farklı: {x} {p}.",
    },
    "en": {
        "outcome": ["the home side", "a draw", "the away side"],
        "elo": "{t} lead by {n} rating points.",
        "form": "Last 5 games: {t} {a} points per game, {o} {b}.",
        "xg": "xG difference over the last 10: {t} {a}, {o} {b}.",
        "home": "{t} take {a} points per game at home.",
        "away": "{t} take {a} points per game away.",
        "rest": "{tired} played {n} days ago; {fresh} are fresher.",
        "even": "Evenly matched; no result above {p}.",
        "derby": "Derby match.",
        "agree": "The market also backs {x} ({p}).",
        "differ": "The market differs: {x} {p}.",
    },
}


def pct(x: float, lang: str) -> str:
    return f"%{round(x * 100)}" if lang == "tr" else f"{round(x * 100)}%"


def num(x: float, lang: str) -> str:
    s = f"{x:.1f}"
    return s.replace(".", ",") if lang == "tr" else s


def reasons(f: dict, p: np.ndarray, market: np.ndarray | None, names: dict[str, str], h: str, a: str, lang: str = "tr") -> list[str]:
    """Short plain-language explanations, strongest first, only ones that support the pick."""
    T = TEXT[lang]
    n1 = lambda x: num(x, lang)  # noqa: E731
    local = {**names, **EN_NAMES} if lang == "en" else names
    hn, an = local.get(h, h), local.get(a, a)
    pick = int(np.argmax(p))
    side = {0: 1, 1: 0, 2: -1}[pick]  # +1 home favoured, -1 away favoured
    out: list[tuple[float, str]] = []

    if side and abs(f["elo_diff"]) >= 60 and np.sign(f["elo_diff"]) == side:
        t = hn if side > 0 else an
        out.append((abs(f["elo_diff"]) / 60, T["elo"].format(t=t, n=round(abs(f["elo_diff"])))))
    for tag, team, other in (("h", hn, an), ("a", an, hn)):
        sgn = 1 if tag == "h" else -1
        if side != sgn:
            continue
        o = "a" if tag == "h" else "h"
        if pd.notna(f[f"ppg5_{tag}"]) and pd.notna(f[f"ppg5_{o}"]) and f[f"ppg5_{tag}"] - f[f"ppg5_{o}"] >= 0.8:
            out.append((f[f"ppg5_{tag}"] - f[f"ppg5_{o}"], T["form"].format(t=team, o=other, a=n1(f[f"ppg5_{tag}"]), b=n1(f[f"ppg5_{o}"]))))
        if pd.notna(f[f"xgd10_{tag}"]) and pd.notna(f[f"xgd10_{o}"]) and f[f"xgd10_{tag}"] - f[f"xgd10_{o}"] >= 0.5:
            out.append((f[f"xgd10_{tag}"] - f[f"xgd10_{o}"], T["xg"].format(t=team, o=other, a=n1(f[f"xgd10_{tag}"]), b=n1(f[f"xgd10_{o}"]))))
    if side > 0 and pd.notna(f["venue_ppg_h"]) and f["venue_ppg_h"] >= 2.0:
        out.append((f["venue_ppg_h"] - 1.5, T["home"].format(t=hn, a=n1(f["venue_ppg_h"]))))
    if side < 0 and pd.notna(f["venue_ppg_a"]) and f["venue_ppg_a"] >= 1.8:
        out.append((f["venue_ppg_a"] - 1.3, T["away"].format(t=an, a=n1(f["venue_ppg_a"]))))
    if abs(f["rest_h"] - f["rest_a"]) >= 3 and min(f["rest_h"], f["rest_a"]) <= 4:
        fresh, tired = (hn, an) if f["rest_h"] > f["rest_a"] else (an, hn)
        out.append((0.8, T["rest"].format(tired=tired, fresh=fresh, n=int(min(f["rest_h"], f["rest_a"])))))
    if pick == 1:
        out.append((1.0, T["even"].format(p=pct(max(p), lang))))
    if f["derby"]:
        out.append((0.5, T["derby"]))

    out.sort(key=lambda x: -x[0])
    lines = [t for _, t in out[:3]]
    if market is not None:
        mk_pick = int(np.argmax(market))
        if mk_pick == pick:
            lines.append(T["agree"].format(x=T["outcome"][pick], p=pct(market[pick], lang)))
        else:
            lines.append(T["differ"].format(x=T["outcome"][mk_pick], p=pct(market[mk_pick], lang)))
    return lines


def per_game(s: Strengths, team: str) -> tuple[float, float]:
    """Goals for/against per game against an average opponent, home and away averaged."""
    att, dfc = s.attack.get(team, s.prior[0]), s.defence.get(team, s.prior[1])
    gf = (np.exp(s.mu + s.home + att) + np.exp(s.mu + att)) / 2
    ga = (np.exp(s.mu - dfc) + np.exp(s.mu + s.home - dfc)) / 2
    return round(float(gf), 2), round(float(ga), 2)


def ratings(engine: Engine, fixtures: list[dict], now: pd.Timestamp) -> dict:
    """Per-league power ranking: Elo, its change in the last game, and goal-model attack/defence."""
    out: dict[str, list[dict]] = {}
    for league in sorted({f["league"] for f in fixtures}):
        season = season_of(max(f["kickoff"] for f in fixtures if f["league"] == league))
        teams = sorted({t for f in fixtures if f["league"] == league for t in (f["home"], f["away"])})
        # Replay the league to see how much each team's last game moved its rating.
        replay, last = Elo(), {}
        for d, s, h, a, hg, ag, *_ in engine.history[league]:
            before = (replay.get(h, s), replay.get(a, s))
            replay.update(h, a, hg, ag, s)
            last[h], last[a] = replay.r[h] - before[0], replay.r[a] - before[1]
        goals, qual = engine.strengths(league, season, now.normalize())
        rows = []
        for t in teams:
            gf, ga = per_game(goals, t)
            xgf, xga = per_game(qual, t)
            rows.append({
                "team": t,
                "elo": round(engine.elo[league].get(t, season), 1),
                "last": round(last.get(t, 0.0), 1),
                "gf": gf,
                "ga": ga,
                "xgf": xgf,
                "xga": xga,
            })
        rows.sort(key=lambda r: -r["elo"])
        out[league] = rows
    return out


def main() -> None:
    now = pd.Timestamp(os.environ.get("RINVALO_NOW") or datetime.now(timezone.utc))
    now = now.tz_convert(None) if now.tzinfo else now  # naive UTC
    df = load_matches()
    engine = Engine(fit_shot_coef(df, ["2021-22", "2022-23"]))
    X = build_training(df, engine)
    model = fit(X)
    names = json.loads((DATA / "team-names.json").read_text("utf-8")) if (DATA / "team-names.json").exists() else {}
    odds = load_upcoming_odds()

    pred_path = DATA / "predictions.json"
    store = json.loads(pred_path.read_text("utf-8")) if pred_path.exists() else {"model": VERSION, "predictions": {}}
    preds = store["predictions"]
    made_at = now.tz_localize("UTC").isoformat().replace("+00:00", "Z")

    fixtures = sorted(load_fixtures(), key=lambda f: f["kickoff"])
    refreshed = 0
    for f in fixtures:
        kick = pd.Timestamp(f["kickoff"]).tz_convert(None)
        if not ((f["status"] == "scheduled" and kick > now) or f["status"] == "postponed"):
            continue
        date = max(kick.normalize(), now.normalize())
        feats = engine.features(f["league"], season_of(f["kickoff"]), date, f["home"], f["away"])
        row = pd.DataFrame([feats])
        p = model.probs(row)[0]
        dc = np.array([feats["dc_ph"], feats["dc_pd"], feats["dc_pa"]])
        xq = np.array([feats["xq_ph"], feats["xq_pd"], feats["xq_pa"]])
        o = odds.get((f["league"], f["home"], f["away"]))
        market = market_probs(o[0], o[1], o[2]) if o else None

        lh, la = rates_for(p, feats["dc_lh"], feats["dc_la"])
        grid = score_grid(lh, la)
        cells = sorted(((h, a, grid[h, a]) for h in range(grid.shape[0]) for a in range(grid.shape[1])), key=lambda c: -c[2])
        pick = int(np.argmax(p))
        in_pick = next(c for c in cells if (c[0] > c[1], c[0] == c[1], c[0] < c[1])[pick])
        level = confidence(p[None], [dc[None], xq[None]], market[None] if market is not None else None)[0]
        r4 = lambda x: round(float(x), 4)  # noqa: E731
        preds[f["id"]] = {
            "fixtureId": f["id"],
            "madeAt": made_at,
            "model": VERSION,
            "lh": round(lh, 3),
            "la": round(la, 3),
            "p": [r4(x) for x in p],
            "score": [int(in_pick[0]), int(in_pick[1])],
            "top": [[int(h), int(a), r4(v)] for h, a, v in cells[:6]],
            "over25": r4(grid[np.add.outer(range(grid.shape[0]), range(grid.shape[1])) > 2].sum()),
            "btts": r4(grid[1:, 1:].sum()),
            "grid": [[r4(v) for v in row_[:6]] for row_ in grid[:6]],
            "confidence": str(level),
            "reasons": reasons(feats, p, market, names, f["home"], f["away"]),
            "reasonsEn": reasons(feats, p, market, names, f["home"], f["away"], "en"),
            "market": [r4(x) for x in market] if market is not None else None,
            "components": {"goals": [r4(x) for x in dc], "shots": [r4(x) for x in xq], "elo": round(float(feats["elo_diff"]))},
        }
        refreshed += 1

    store["model"] = VERSION
    pred_path.write_text(json.dumps(store, ensure_ascii=False, separators=(",", ":")) + "\n", "utf-8")

    (DATA / "ratings.json").write_text(
        json.dumps({"at": made_at, "leagues": ratings(engine, fixtures, now)}, ensure_ascii=False, separators=(",", ":")) + "\n", "utf-8"
    )

    # Pre-match market view of finished current-season games, for the "Rinvalo vs market" record.
    current = df[df["season"] == df["season"].max()]
    market_out = {
        f"{r.home}-{r.away}": [round(float(x), 4) for x in market_probs(r.oh, r.od, r.oa)]
        for r in current.itertuples()
        if pd.notna(r.oh) and pd.notna(r.oa)
    }
    (DATA / "market.json").write_text(json.dumps(market_out, separators=(",", ":")) + "\n", "utf-8")
    print(f"{refreshed} tahmin güncellendi ({VERSION}), {len(market_out)} maçın piyasa verisi kaydedildi")


if __name__ == "__main__":
    main()
