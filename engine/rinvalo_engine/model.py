"""The Rinvalo model: a regularised multinomial regression over the component models.

Walk-forward testing (engine/backtest.py) compared this with gradient boosting on the full
feature set; boosting overfitted and produced worse probabilities, so the published model
combines only the signals that held up: goal-based and shot/xG-based Dixon-Coles
probabilities and the Elo difference.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from scipy.optimize import least_squares
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.preprocessing import StandardScaler

from .ratings import outcome_probs, score_grid

INPUTS = ["dc_ph", "dc_pa", "xq_ph", "xq_pa", "elo_diff"]
# The archive starts in August 2021, so the first half-season of features is built on almost
# no history. Training starts after this warm-up.
WARM_UP = pd.Timestamp("2022-01-01")
VERSION = "rinvalo-2"


@dataclass
class RinvaloModel:
    pipe: Pipeline

    def probs(self, df: pd.DataFrame) -> np.ndarray:
        return self.pipe.predict_proba(df[INPUTS])


def fit(train: pd.DataFrame) -> RinvaloModel:
    rows = train[train["date"] >= WARM_UP]
    pipe = make_pipeline(StandardScaler(), LogisticRegression(C=0.1, max_iter=3000))
    pipe.fit(rows[INPUTS], rows["outcome"])
    return RinvaloModel(pipe)


def rates_for(p: np.ndarray, lh0: float, la0: float) -> tuple[float, float]:
    """Expected goals whose score grid reproduces the target home/away win probabilities.

    Starts from the goal model's rates and keeps the total close to it, so over/under and
    both-teams-to-score stay consistent with the published 1-X-2.
    """
    total0 = lh0 + la0

    def resid(x):
        lh, la = np.exp(x)
        o = outcome_probs(score_grid(lh, la))
        return [o[0] - p[0], o[2] - p[2], 0.05 * (lh + la - total0)]

    sol = least_squares(resid, x0=np.log([lh0, la0]), bounds=(np.log(0.15), np.log(6)))
    lh, la = np.exp(sol.x)
    return float(lh), float(la)
