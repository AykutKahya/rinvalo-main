from __future__ import annotations

import numpy as np

EPS = 1e-6


def scores(p: np.ndarray, y: np.ndarray) -> dict[str, float]:
    onehot = np.eye(3)[y]
    cum_p, cum_y = np.cumsum(p, axis=1)[:, :2], np.cumsum(onehot, axis=1)[:, :2]
    return {
        "matches": int(len(y)),
        "accuracy": float(np.mean(p.argmax(axis=1) == y)),
        "logloss": float(-np.mean(np.log(np.clip(p[np.arange(len(y)), y], EPS, 1)))),
        "brier": float(np.mean(np.sum((p - onehot) ** 2, axis=1))),
        "rps": float(np.mean(np.sum((cum_p - cum_y) ** 2, axis=1) / 2)),
    }


def calibration(p: np.ndarray, y: np.ndarray, bins: int = 10) -> list[dict[str, float]]:
    """Every (match, outcome) probability bucketed; observed frequency per bucket."""
    probs = p.ravel()
    hits = np.eye(3)[y].ravel()
    out = []
    for i in range(bins):
        lo, hi = i / bins, (i + 1) / bins
        m = (probs >= lo) & (probs < hi if i < bins - 1 else probs <= hi)
        if m.sum() >= 20:
            out.append({"bin": f"{lo:.1f}-{hi:.1f}", "predicted": float(probs[m].mean()), "observed": float(hits[m].mean()), "n": int(m.sum())})
    return out


def confidence(model: np.ndarray, components: list[np.ndarray], market: np.ndarray | None = None) -> np.ndarray:
    """'high' / 'medium' / 'low' from the size of the edge and whether the models (and, when
    odds exist, the market) point the same way."""
    pick = model.argmax(axis=1)
    top = model.max(axis=1)
    agree = np.all([c.argmax(axis=1) == pick for c in components], axis=0)
    if market is not None:
        has = ~np.isnan(market).any(axis=1)
        mk_pick = np.where(has, np.nan_to_num(market).argmax(axis=1), pick)
        agree &= mk_pick == pick
    level = np.full(len(model), "medium", dtype=object)
    level[(top >= 0.55) & agree] = "high"
    level[(top < 0.42) | (~agree & (top < 0.5))] = "low"
    return level
