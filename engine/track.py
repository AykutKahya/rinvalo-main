"""Live tracking of the engine: this season's frozen predictions against the results, per league.

A league is flagged "watch" when its log loss this season is worse than in the walk-forward test
(site/data/engine-backtest.json) by more than two standard errors, once it has 30 settled games.
The bot runs this after every update; a flag shows on the accuracy page and as a warning in the
GitHub Actions run, so a drifting league is noticed before it is fixed by hand.

    python engine/track.py   -> site/data/tracking.json
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from rinvalo_engine.data import DATA  # noqa: E402
from rinvalo_engine.metrics import EPS, calibration, scores  # noqa: E402

MIN_GAMES = 30


def read(name: str, default):
    path = DATA / name
    return json.loads(path.read_text("utf-8")) if path.exists() else default


def main() -> None:
    preds = read("predictions.json", {"predictions": {}})["predictions"]
    market = read("market.json", {})
    hist = read("engine-backtest.json", {}).get("perLeague", {})
    fixtures = read("season.json", {"fixtures": []})["fixtures"] + read("cups.json", {"fixtures": []})["fixtures"]
    settled = [f for f in fixtures if f["status"] == "finished" and f.get("hg") is not None and f["id"] in preds]

    def outcome(f) -> int:
        return 0 if f["hg"] > f["ag"] else 1 if f["hg"] == f["ag"] else 2

    leagues = {}
    warnings = []
    for lg in sorted({f["league"] for f in settled}):
        rows = [f for f in settled if f["league"] == lg]
        p = np.array([preds[f["id"]]["p"] for f in rows], dtype=float)
        y = np.array([outcome(f) for f in rows])
        s = scores(p, y)
        loss = -np.log(np.clip(p[np.arange(len(y)), y], EPS, 1))
        se = float(loss.std(ddof=1) / np.sqrt(len(y))) if len(y) > 1 else None
        base = hist.get(lg, {}).get("rinvalo", {}).get("logloss")
        with_market = [i for i, f in enumerate(rows) if f["id"] in market]
        mk = scores(np.array([market[rows[i]["id"]] for i in with_market]), y[with_market]) if with_market else None
        if base is None or len(y) < MIN_GAMES:
            status = "few"
        elif s["logloss"] - base > 2 * se:
            status = "watch"
            warnings.append(f"{lg}: bu sezon log loss {s['logloss']:.3f}, testte {base:.3f} ({len(y)} maç)")
        else:
            status = "ok"
        leagues[lg] = {
            "matches": s["matches"],
            "accuracy": round(s["accuracy"], 4),
            "logloss": round(s["logloss"], 4),
            "se": round(se, 4) if se else None,
            "test": round(base, 4) if base else None,
            "market": round(mk["logloss"], 4) if mk else None,
            "marketMatches": len(with_market),
            "status": status,
        }

    p = np.array([preds[f["id"]]["p"] for f in settled], dtype=float).reshape(-1, 3)
    y = np.array([outcome(f) for f in settled])

    def binary(key: str, market_key: str, happened) -> dict | None:
        """A yes/no market (over 2.5, both teams score): hit rate at 50%, Brier score, games."""
        rows = [(preds[f["id"]][key], happened(f), preds[f["id"]].get(market_key)) for f in settled if preds[f["id"]].get(key) is not None]
        if not rows:
            return None
        q = np.array([r[0] for r in rows], dtype=float)
        o = np.array([r[1] for r in rows], dtype=float)
        rate = float(o.mean())
        # The same games, Rinvalo against the betting market, where the market's price was saved.
        both = [r for r in rows if r[2] is not None]
        vs = None
        if both:
            qr = np.array([r[0] for r in both], dtype=float)
            qm = np.array([r[2] for r in both], dtype=float)
            ob = np.array([r[1] for r in both], dtype=float)
            vs = {
                "matches": len(both),
                "accuracy": round(float(np.mean((qr > 0.5) == (ob == 1))), 4),
                "brier": round(float(np.mean((qr - ob) ** 2)), 4),
                "marketAccuracy": round(float(np.mean((qm > 0.5) == (ob == 1))), 4),
                "marketBrier": round(float(np.mean((qm - ob) ** 2)), 4),
            }
        return {
            "matches": len(rows),
            "accuracy": round(float(np.mean((q > 0.5) == (o == 1))), 4),
            "brier": round(float(np.mean((q - o) ** 2)), 4),
            "rate": round(rate, 4),
            # The bar to clear: always calling the more common side, at the rate it actually happened.
            "baseAccuracy": round(max(rate, 1 - rate), 4),
            "baseBrier": round(rate * (1 - rate), 4),
            "market": vs,
        }

    out = {
        "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "overall": {k: round(v, 4) if isinstance(v, float) else v for k, v in scores(p, y).items()} if len(y) else None,
        "calibration": calibration(p, y) if len(y) else [],
        "over25": binary("over25", "marketOver25", lambda f: f["hg"] + f["ag"] > 2),
        "btts": binary("btts", "marketBtts", lambda f: f["hg"] > 0 and f["ag"] > 0),
        "leagues": leagues,
    }
    (DATA / "tracking.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", "utf-8")

    print(f"İzleme: {len(y)} sonuçlanmış tahmin, {sum(v['status'] == 'watch' for v in leagues.values())} lig izleniyor.")
    for w in warnings:
        # Shown on the run's summary page in GitHub Actions.
        print(f"::warning title=Model izleme::{w}")


if __name__ == "__main__":
    main()
