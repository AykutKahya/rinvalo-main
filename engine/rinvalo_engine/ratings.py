"""Component models: Dixon-Coles style Poisson strengths and Elo ratings."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.stats import poisson

MAX_GOALS = 10
RHO = -0.07


@dataclass
class Strengths:
    mu: float
    home: float
    attack: dict[str, float]
    defence: dict[str, float]
    prior: tuple[float, float]

    def rates(self, h: str, a: str) -> tuple[float, float]:
        pa, pd_ = self.prior
        lh = np.exp(self.mu + self.home + self.attack.get(h, pa) - self.defence.get(a, pd_))
        la = np.exp(self.mu + self.attack.get(a, pa) - self.defence.get(h, pd_))
        return float(lh), float(la)


def fit_strengths(
    home: np.ndarray,
    away: np.ndarray,
    gh: np.ndarray,
    ga: np.ndarray,
    age_days: np.ndarray,
    established: set[str],
    half_life: float = 240.0,
    shrink: float = 4.0,
    newcomer: tuple[float, float] = (-0.22, -0.18),
) -> Strengths:
    """Time-weighted Poisson attack/defence strengths, fitted by block coordinate ascent.

    `gh`/`ga` may be goals or any non-negative "expected goals" target (xG, shot-based).
    Teams outside `established` (no previous-season data in the league) shrink to a
    promoted-team prior instead of the league average.
    """
    w = 0.5 ** (age_days / half_life)
    keep = w > 0.01
    home, away, gh, ga, w = home[keep], away[keep], gh[keep], ga[keep], w[keep]
    teams = sorted(set(home) | set(away) | set(established))
    ix = {t: i for i, t in enumerate(teams)}
    hi = np.array([ix[t] for t in home], dtype=int)
    ai = np.array([ix[t] for t in away], dtype=int)
    n = len(teams)
    prior_a = np.array([0.0 if t in established else newcomer[0] for t in teams])
    prior_d = np.array([0.0 if t in established else newcomer[1] for t in teams])
    att, dfn = prior_a.copy(), prior_d.copy()
    total_w = max(w.sum() * 2, 1e-9)
    mu = float(np.log(max((w * (gh + ga)).sum() / total_w, 0.5)))
    hadv = 0.2
    clip = lambda x: np.clip(x, -0.5, 0.5)  # noqa: E731

    for _ in range(100):
        lh = np.exp(mu + hadv + att[hi] - dfn[ai])
        la = np.exp(mu + att[ai] - dfn[hi])
        g = np.bincount(hi, w * (gh - lh), n) + np.bincount(ai, w * (ga - la), n)
        h = np.bincount(hi, w * lh, n) + np.bincount(ai, w * la, n)
        step_a = clip((g - shrink * (att - prior_a)) / (h + shrink))
        att += step_a

        lh = np.exp(mu + hadv + att[hi] - dfn[ai])
        la = np.exp(mu + att[ai] - dfn[hi])
        g = np.bincount(ai, w * (lh - gh), n) + np.bincount(hi, w * (la - ga), n)
        h = np.bincount(ai, w * lh, n) + np.bincount(hi, w * la, n)
        step_d = clip((g - shrink * (dfn - prior_d)) / (h + shrink))
        dfn += step_d

        lh = np.exp(mu + hadv + att[hi] - dfn[ai])
        la = np.exp(mu + att[ai] - dfn[hi])
        step_mu = float(np.clip((w * (gh - lh + ga - la)).sum() / max((w * (lh + la)).sum(), 1e-9), -0.5, 0.5))
        mu += step_mu
        step_h = float(np.clip((w * (gh - lh)).sum() / max((w * lh).sum(), 1e-9) - step_mu, -0.5, 0.5))
        hadv += step_h
        if max(np.abs(step_a).max(initial=0), np.abs(step_d).max(initial=0), abs(step_mu), abs(step_h)) < 1e-6:
            break

    return Strengths(mu, hadv, dict(zip(teams, att)), dict(zip(teams, dfn)), newcomer)


def score_grid(lh: float, la: float, rho: float = RHO) -> np.ndarray:
    """Probability of every scoreline 0..MAX_GOALS with the Dixon-Coles low-score correction."""
    k = np.arange(MAX_GOALS + 1)
    grid = np.outer(poisson.pmf(k, lh), poisson.pmf(k, la))
    grid[0, 0] *= 1 - lh * la * rho
    grid[0, 1] *= 1 + lh * rho
    grid[1, 0] *= 1 + la * rho
    grid[1, 1] *= 1 - rho
    return grid / grid.sum()


def outcome_probs(grid: np.ndarray) -> np.ndarray:
    return np.array([np.tril(grid, -1).sum(), np.trace(grid), np.triu(grid, 1).sum()])


class Elo:
    """Goal-difference Elo with home advantage and regression to the mean between seasons."""

    def __init__(self, k: float = 22.0, home: float = 65.0, carry: float = 0.7, newcomer: float = 1420.0):
        self.k, self.home, self.carry, self.newcomer = k, home, carry, newcomer
        self.r: dict[str, float] = {}
        self.season: dict[str, str] = {}

    def get(self, team: str, season: str, league_teams: set[str] | None = None) -> float:
        if team not in self.r:
            self.r[team] = self.newcomer
            self.season[team] = season
        elif self.season[team] != season:
            # New season: squads change, so pull a third of the way back to the league mean.
            self.r[team] = 1500 + self.carry * (self.r[team] - 1500)
            self.season[team] = season
        return self.r[team]

    def expected(self, rh: float, ra: float) -> float:
        return 1 / (1 + 10 ** ((ra - (rh + self.home)) / 400))

    def update(self, h: str, a: str, hg: int, ag: int, season: str) -> None:
        rh, ra = self.get(h, season), self.get(a, season)
        exp = self.expected(rh, ra)
        res = 1.0 if hg > ag else 0.5 if hg == ag else 0.0
        gd = abs(hg - ag)
        margin = 1.0 if gd <= 1 else 1.0 + float(np.log(gd))
        delta = self.k * margin * (res - exp)
        self.r[h] = rh + delta
        self.r[a] = ra - delta
