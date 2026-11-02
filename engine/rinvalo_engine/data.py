"""Load matches with shots, xG and odds into one point-in-time ordered table."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

DATA = Path(__file__).resolve().parents[2] / "site" / "data"

STAT_COLUMNS = [
    "league", "season", "date", "home", "away", "hg", "ag", "hs", "as_", "hst", "ast", "hxg", "axg",
    "oh", "od", "oa", "ch", "cd", "ca", "o25", "u25",
]


def _read(name: str, default):
    path = DATA / name
    return json.loads(path.read_text("utf-8")) if path.exists() else default


def load_matches() -> pd.DataFrame:
    """All finished league matches: archive seasons plus the current season.

    Current-season rows come from football-data (shots, xG, odds); results the primary
    source already has but football-data has not published yet are added with goals only.
    """
    rows = _read("stats-history.json", []) + _read("stats-current.json", [])
    df = pd.DataFrame(rows, columns=STAT_COLUMNS)

    season = _read("season.json", {"season": "", "fixtures": []})
    known = set(zip(df["league"], df["home"], df["away"], df["season"]))
    extra = []
    for f in season.get("fixtures", []):
        if f["status"] != "finished" or f["hg"] is None:
            continue
        key = (f["league"], f["home"], f["away"], _season_of(f["kickoff"]))
        if key in known:
            continue
        extra.append({"league": f["league"], "season": key[3], "date": f["kickoff"][:10], "home": f["home"],
                      "away": f["away"], "hg": f["hg"], "ag": f["ag"]})
    if extra:
        df = pd.concat([df, pd.DataFrame(extra)], ignore_index=True)

    df["date"] = pd.to_datetime(df["date"])
    df = df.drop_duplicates(subset=["league", "season", "home", "away"], keep="first")
    for c in STAT_COLUMNS[5:]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    return df.sort_values(["date", "league", "home"]).reset_index(drop=True)


def _season_of(iso: str) -> str:
    year, month = int(iso[:4]), int(iso[5:7])
    start = year if month >= 7 else year - 1
    return f"{start}-{str(start + 1)[2:]}"


def load_fixtures() -> list[dict]:
    return _read("season.json", {"fixtures": []}).get("fixtures", [])


def load_upcoming_odds() -> dict[tuple[str, str, str], tuple[float, float, float, float | None, float | None]]:
    """Average pre-match odds for upcoming games, keyed by (league, home, away)."""
    out = {}
    for r in _read("odds-upcoming.json", []):
        out[(r[0], r[1], r[2])] = tuple(r[3:8])
    return out


def load_moviodds() -> dict[str, list]:
    """MoviOdds prices by fixture id: [home, draw, away, over 2.5, under 2.5, btts yes, btts no] (None when missing)."""
    return _read("odds-moviodds.json", {})


def two_way(yes, no) -> float | None:
    """A yes/no price pair to the margin-free probability of yes."""
    if not yes or not no or yes <= 1 or no <= 1:
        return None
    return (1 / yes) / (1 / yes + 1 / no)


def market_probs(oh, od, oa) -> np.ndarray:
    """Bookmaker prices to probabilities with the margin removed proportionally."""
    inv = np.array([1 / oh, 1 / od, 1 / oa], dtype=float)
    return inv / inv.sum()
