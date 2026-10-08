"""Walk-forward evaluation of the Rinvalo engine.

For each test season S the model is fitted only on seasons before S, and every feature of a
match is computed from games played before its kick-off. Writes site/data/engine-backtest.json,
which the site's accuracy page publishes.

    python engine/backtest.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from rinvalo_engine.data import DATA, load_matches  # noqa: E402
from rinvalo_engine.features import Engine, build_training, fit_shot_coef  # noqa: E402
from rinvalo_engine.metrics import calibration, confidence, scores  # noqa: E402
from rinvalo_engine.model import fit  # noqa: E402

TEST_SEASONS = ["2023-24", "2024-25", "2025-26"]


def main() -> None:
    df = load_matches()
    X = build_training(df, Engine(fit_shot_coef(df, ["2021-22", "2022-23"])))
    parts = []
    for s in TEST_SEASONS:
        test = X[X["season"] == s].copy()
        test[["r_ph", "r_pd", "r_pa"]] = fit(X[X["season"] < s]).probs(test)
        parts.append(test)
    T = pd.concat(parts)
    T = T[T["mk_ph"].notna() & T["ck_ph"].notna()]  # same matches for every row of the table
    y = T["outcome"].to_numpy()
    p = lambda pre: T[[f"{pre}_ph", f"{pre}_pd", f"{pre}_pa"]].to_numpy()  # noqa: E731
    rin, dc, xq, mk, ck = p("r"), p("dc"), p("xq"), p("mk"), p("ck")

    conf = confidence(rin, [dc, xq], mk)
    pick = rin.argmax(1)
    differ = pick != mk.argmax(1)
    report = {
        "seasons": TEST_SEASONS,
        "overall": {
            "Eski model (yalnız skorlar)": scores(dc, y),
            "Rinvalo modeli": scores(rin, y),
            "Piyasa (maç öncesi oranlar)": scores(mk, y),
            "Piyasa (kapanış oranları)": scores(ck, y),
        },
        "perLeague": {
            lg: {"rinvalo": scores(rin[m], y[m]), "old": scores(dc[m], y[m]), "market": scores(mk[m], y[m])}
            for lg in sorted(T["league"].unique())
            for m in [(T["league"] == lg).to_numpy()]
        },
        "byConfidence": {
            lvl: {"matches": int((conf == lvl).sum()), "accuracy": float(np.mean(pick[conf == lvl] == y[conf == lvl]))}
            for lvl in ("high", "medium", "low")
        },
        "calibration": calibration(rin, y),
        "disagreement": {
            "matches": int(differ.sum()),
            "rinvaloRight": float(np.mean(pick[differ] == y[differ])),
            "marketRight": float(np.mean(mk.argmax(1)[differ] == y[differ])),
        },
    }
    (DATA / "engine-backtest.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), "utf-8")

    for k, v in report["overall"].items():
        print(f"{k:32s} isabet %{v['accuracy']*100:5.1f}  logloss {v['logloss']:.4f}  brier {v['brier']:.4f}  rps {v['rps']:.4f}  ({v['matches']} maç)")
    for lg, d in report["perLeague"].items():
        print(f"  {lg:16s} rinvalo %{d['rinvalo']['accuracy']*100:.1f}  eski %{d['old']['accuracy']*100:.1f}  piyasa %{d['market']['accuracy']*100:.1f}")
    print("güven:", {k: (v["matches"], round(v["accuracy"] * 100, 1)) for k, v in report["byConfidence"].items()})
    print("ayrışma:", report["disagreement"])
    print("kalibrasyon:", [(c["bin"], round(c["predicted"], 3), round(c["observed"], 3)) for c in report["calibration"]])


if __name__ == "__main__":
    main()
