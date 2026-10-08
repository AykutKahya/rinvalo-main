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
from rinvalo_engine.ratings import score_grid  # noqa: E402

OUTCOME = ["ev sahibi", "beraberlik", "deplasman"]


def pct(x: float) -> str:
    return f"%{round(x * 100)}"


def num(x: float) -> str:
    return f"{x:.1f}".replace(".", ",")


def reasons(f: dict, p: np.ndarray, market: np.ndarray | None, names: dict[str, str], h: str, a: str) -> list[str]:
    """Short plain-language explanations, strongest first, only ones that support the pick."""
    hn, an = names.get(h, h), names.get(a, a)
    pick = int(np.argmax(p))
    side = {0: 1, 1: 0, 2: -1}[pick]  # +1 home favoured, -1 away favoured
    out: list[tuple[float, str]] = []

    if side and abs(f["elo_diff"]) >= 60 and np.sign(f["elo_diff"]) == side:
        t = hn if side > 0 else an
        out.append((abs(f["elo_diff"]) / 60, f"{t} güç puanında {round(abs(f['elo_diff']))} puan önde (Elo)."))
    for tag, team, other in (("h", hn, an), ("a", an, hn)):
        sgn = 1 if tag == "h" else -1
        if side != sgn:
            continue
        o = "a" if tag == "h" else "h"
        if pd.notna(f[f"ppg5_{tag}"]) and pd.notna(f[f"ppg5_{o}"]) and f[f"ppg5_{tag}"] - f[f"ppg5_{o}"] >= 0.8:
            out.append((f[f"ppg5_{tag}"] - f[f"ppg5_{o}"], f"{team} son 5 maçta maç başı {num(f[f'ppg5_{tag}'])} puan topladı, {other} {num(f[f'ppg5_{o}'])}."))
        if pd.notna(f[f"xgd10_{tag}"]) and pd.notna(f[f"xgd10_{o}"]) and f[f"xgd10_{tag}"] - f[f"xgd10_{o}"] >= 0.5:
            out.append((f[f"xgd10_{tag}"] - f[f"xgd10_{o}"], f"{team} son 10 maçta pozisyon üretiminde üstün (maç başı xG farkı {num(f[f'xgd10_{tag}'])}, rakibinin {num(f[f'xgd10_{o}'])})."))
    if side > 0 and pd.notna(f["venue_ppg_h"]) and f["venue_ppg_h"] >= 2.0:
        out.append((f["venue_ppg_h"] - 1.5, f"{hn} evinde son maçlarında maç başı {num(f['venue_ppg_h'])} puan aldı."))
    if side < 0 and pd.notna(f["venue_ppg_a"]) and f["venue_ppg_a"] >= 1.8:
        out.append((f["venue_ppg_a"] - 1.3, f"{an} deplasmanda son maçlarında maç başı {num(f['venue_ppg_a'])} puan aldı."))
    if abs(f["rest_h"] - f["rest_a"]) >= 3 and min(f["rest_h"], f["rest_a"]) <= 4:
        fresh, tired = (hn, an) if f["rest_h"] > f["rest_a"] else (an, hn)
        out.append((0.8, f"{fresh} daha dinlenmiş: rakibi {tired} {int(min(f['rest_h'], f['rest_a']))} gün önce maç oynadı."))
    if pick == 1:
        out.append((1.0, f"İki takımın gücü birbirine yakın; hiçbir sonuç {pct(max(p))} üstüne çıkmıyor."))
    if f["derby"]:
        out.append((0.5, "Derbi: bu maçlarda sürpriz ihtimali her zamankinden yüksektir."))

    out.sort(key=lambda x: -x[0])
    lines = [t for _, t in out[:3]]
    if market is not None:
        mk_pick = int(np.argmax(market))
        if mk_pick == pick:
            lines.append(f"Bahis piyasası da {OUTCOME[pick]} tarafında ({pct(market[pick])}).")
        else:
            lines.append(f"Bahis piyasası farklı düşünüyor: {OUTCOME[mk_pick]} {pct(market[mk_pick])}.")
    return lines


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
            "market": [r4(x) for x in market] if market is not None else None,
            "components": {"goals": [r4(x) for x in dc], "shots": [r4(x) for x in xq], "elo": round(float(feats["elo_diff"]))},
        }
        refreshed += 1

    store["model"] = VERSION
    pred_path.write_text(json.dumps(store, ensure_ascii=False, separators=(",", ":")) + "\n", "utf-8")

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
