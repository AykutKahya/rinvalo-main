"""Engine sanity tests: python -m unittest discover -s engine"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from rinvalo_engine.data import market_probs  # noqa: E402
from rinvalo_engine.features import Engine, build_training  # noqa: E402
from rinvalo_engine.metrics import confidence, scores  # noqa: E402
from rinvalo_engine.model import rates_for  # noqa: E402
from rinvalo_engine.ratings import match_outcomes, outcome_probs, score_grid  # noqa: E402


def matches(n_rounds: int = 6) -> pd.DataFrame:
    teams = ["a", "b", "c", "d"]
    rows, day = [], 0
    for r in range(n_rounds):
        for h in teams:
            for aw in teams:
                if h == aw:
                    continue
                rows.append({"league": "super-lig", "season": "2024-25", "date": pd.Timestamp("2024-08-10") + pd.Timedelta(days=day),
                             "home": h, "away": aw, "hg": 3 if h == "a" else 1, "ag": 2 if aw == "a" else 1,
                             "hs": 12, "as_": 9, "hst": 5, "ast": 3})
                day += 2
    return pd.DataFrame(rows)


class EngineTest(unittest.TestCase):
    def test_market_probs_remove_margin(self):
        p = market_probs(2.0, 3.4, 3.8)
        self.assertAlmostEqual(p.sum(), 1.0)
        self.assertGreater(p[0], p[2])

    def test_rates_reproduce_target_probabilities(self):
        target = np.array([0.55, 0.25, 0.20])
        lh, la = rates_for(target, 1.4, 1.1)
        got = outcome_probs(score_grid(lh, la))
        self.assertLess(abs(got[0] - target[0]), 0.01)
        self.assertLess(abs(got[2] - target[2]), 0.01)

    def test_grid_matches_published_outcomes(self):
        target = np.array([0.30, 0.40, 0.30])  # more draws than a Poisson grid gives
        grid = match_outcomes(score_grid(*rates_for(target, 1.3, 1.1)), target)
        np.testing.assert_allclose(outcome_probs(grid), target, atol=1e-9)
        self.assertAlmostEqual(grid.sum(), 1.0)

    def test_features_use_only_the_past(self):
        df = matches()
        X = build_training(df, Engine((0.34, 0.0)))
        first = X.iloc[0]
        # Before any game is played nobody has form, and the table is empty.
        self.assertTrue(np.isnan(first["ppg5_h"]))
        self.assertEqual(first["n_h"], 0)
        # Changing a late result must not change any earlier feature row.
        df2 = df.copy()
        df2.loc[len(df2) - 1, "hg"] = 9
        X2 = build_training(df2, Engine((0.34, 0.0)))
        pd.testing.assert_frame_equal(X.iloc[:-1].drop(columns=["hg"]), X2.iloc[:-1].drop(columns=["hg"]))

    def test_strong_team_is_favoured_after_history(self):
        X = build_training(matches(), Engine((0.34, 0.0)))
        last_a_home = X[(X["home"] == "a")].iloc[-1]
        self.assertGreater(last_a_home["dc_ph"], last_a_home["dc_pa"])
        self.assertGreater(last_a_home["elo_diff"], 0)

    def test_confidence_levels(self):
        model = np.array([[0.62, 0.22, 0.16], [0.38, 0.33, 0.29], [0.52, 0.28, 0.20]])
        agree = [model.copy()]
        market = np.array([[0.6, 0.25, 0.15], [np.nan, np.nan, np.nan], [0.30, 0.30, 0.40]])
        self.assertEqual(list(confidence(model, agree, market)), ["high", "low", "medium"])

    def test_scores(self):
        s = scores(np.array([[0.7, 0.2, 0.1], [0.1, 0.2, 0.7]]), np.array([0, 2]))
        self.assertEqual(s["accuracy"], 1.0)
        self.assertLess(s["logloss"], 0.4)


class EuropeTest(unittest.TestCase):
    def test_league_strength_flows_through_cup_games(self):
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from cups import HOME, EuroElo

        elo = EuroElo()
        for t in ("a1", "a2"):
            elo.get(t, "2024-25", "strong")
        for t in ("b1", "b2"):
            elo.get(t, "2024-25", "weak")
        for _ in range(20):
            elo.update("a1", "b1", 2, 0, "2024-25", None, HOME, 28)
            elo.update("b2", "a2", 0, 2, "2024-25", None, HOME, 28)
        self.assertGreater(elo.league_mean("strong"), elo.league_mean("weak") + 50)
        # A club we only meet in Europe starts below the tracked leagues.
        self.assertLess(elo.get("outsider", "2024-25", None), 1500)


if __name__ == "__main__":
    unittest.main()
