"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MatchView } from "@/lib/data";
import { fmt } from "@/lib/format";
import { dict, paths, roundLabel, type Lang } from "@/lib/i18n";

type Comp = { code: string; name: string; accent: string };
import { ConfidenceDot } from "./Confidence";
import { LeagueMark } from "./Crest";
import { useFavorites } from "./favorites";
import { MatchRow } from "./MatchRow";
import { inPlayWindow, useLive } from "./useLive";

type Filter = "all" | "fav" | string;

export function MatchBrowser({ matches, leagues, initialDay, lang }: { matches: MatchView[]; leagues: Comp[]; initialDay: string; lang: Lang }) {
  const { dayKey, dayNum, shortDay } = fmt(lang);
  const t = dict(lang);
  const b = t.browser;
  const { favorites } = useFavorites();
  const [day, setDay] = useState(initialDay);
  const [filter, setFilter] = useState<Filter>("all");
  const [today, setToday] = useState(initialDay);
  // With every league shown, each one opens with its first few games; the rest are a tap away.
  const [open, setOpen] = useState<Set<string>>(new Set());
  const LIMIT = 4;

  // The page is built ahead of time; pick the visitor's real "today" once we are in the browser.
  useEffect(() => {
    const t = dayKey(Date.now());
    setToday(t);
    const days = new Set(matches.map((m) => dayKey(m.kickoff)));
    if (days.has(t)) setDay(t);
    else {
      const next = [...days].sort().find((d) => d >= t);
      if (next) setDay(next);
    }
  }, [matches, dayKey]);

  const days = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of matches) {
      const k = dayKey(m.kickoff);
      if (!map.has(k)) map.set(k, m.kickoff);
    }
    return [...map.entries()].sort((x, y) => x[0].localeCompare(y[0]));
  }, [matches, dayKey]);

  // Live scores for the chosen day's games that are on, without rebuilding the site.
  const [clock, setClock] = useState<number | null>(null);
  useEffect(() => setClock(Date.now()), [day]);
  const live = useLive(clock !== null && matches.some((m) => dayKey(m.kickoff) === day && m.status !== "finished" && inPlayWindow(m.kickoff, clock)));
  const withLive = matches.map((m) => {
    const s = live[m.id];
    return s && s.status !== "scheduled" ? { ...m, status: s.status, hg: s.hg, ag: s.ag } : m;
  });

  const visible = withLive.filter((m) => {
    if (dayKey(m.kickoff) !== day) return false;
    if (filter === "all") return true;
    if (filter === "fav") return favorites.includes(m.home) || favorites.includes(m.away);
    return m.league === filter;
  });

  const counts = new Map<string, number>();
  matches.filter((m) => dayKey(m.kickoff) === day).forEach((m) => counts.set(m.league, (counts.get(m.league) ?? 0) + 1));

  return (
    <>
      <nav className="card league-nav" aria-label={b.filter}>
        <button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          <span>{b.all}</span>
          <span className="count">{[...counts.values()].reduce((a, b) => a + b, 0)}</span>
        </button>
        {leagues.map((l) => (
          <button key={l.code} aria-pressed={filter === l.code} onClick={() => setFilter(l.code)}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <LeagueMark code={l.code} accent={l.accent} />
              {l.name}
            </span>
            <span className="count">{counts.get(l.code) ?? 0}</span>
          </button>
        ))}
        <button aria-pressed={filter === "fav"} onClick={() => setFilter("fav")}>
          <span>{b.favs}</span>
          <span className="count">{favorites.length}</span>
        </button>
      </nav>

      <section aria-label={b.matches} style={{ minWidth: 0 }}>
        <div className="days" role="group" aria-label={b.days}>
          {days.map(([k, iso], i) => (
            <button
              key={k}
              // Days without games are skipped; mark the jump so "Sun 8, Fri 20" does not look like a mistake.
              className={i > 0 && Date.parse(k) - Date.parse(days[i - 1][0]) > 86_400_000 ? "day gap" : "day"}
              aria-pressed={k === day}
              onClick={() => setDay(k)}
              ref={(el) => {
                const rail = el?.parentElement;
                if (el && rail && k === day) rail.scrollLeft = el.offsetLeft - rail.clientWidth / 2 + el.clientWidth / 2;
              }}
            >
              {k === today ? t.today : shortDay(iso)}
              <b>{dayNum(iso)}</b>
              {k === today && <span className="today-dot" />}
            </button>
          ))}
        </div>

        <p className="conf-legend">
          {(["high", "medium", "low"] as const).map((l) => (
            <span key={l}>
              <ConfidenceDot level={l} lang={lang} />
              {t.conf[l]}
            </span>
          ))}
        </p>

        <div key={`${day}:${filter}`} className="stagger">
        {leagues
          .map((l) => ({ l, ms: visible.filter((m) => m.league === l.code) }))
          .filter((g) => g.ms.length)
          .map(({ l, ms }) => (
            <div key={l.code} className="card group reveal">
              <div className="group-head">
                <Link href={paths(lang).leagueOf(l.code)}>
                  <LeagueMark code={l.code} accent={l.accent} size={20} />
                  {l.name}
                  <span className="muted" style={{ fontWeight: 600 }}>
                    · {roundLabel(lang, l.code, ms[0].round)}
                  </span>
                </Link>
                <span>
                  <span className="cols-p3">1 · X · 2 &nbsp;</span>
                  {t.row.pick}
                </span>
              </div>
              {(filter === "all" && !open.has(l.code) && ms.length > LIMIT + 1 ? ms.slice(0, LIMIT) : ms).map((m) => (
                <MatchRow key={m.id} m={m} favorites={favorites} lang={lang} />
              ))}
              {filter === "all" && ms.length > LIMIT + 1 && (
                <button
                  className="more-row"
                  onClick={() =>
                    setOpen((s) => {
                      const n = new Set(s);
                      if (n.has(l.code)) n.delete(l.code);
                      else n.add(l.code);
                      return n;
                    })
                  }
                >
                  {open.has(l.code) ? b.less : b.more(ms.length - LIMIT)}
                </button>
              )}
            </div>
          ))}

        </div>

        {visible.length === 0 && (
          <div className="card empty">
            <b>{filter === "fav" ? (favorites.length ? b.noFavGames : b.noFavs) : b.noGames}</b>
            {filter === "fav" && !favorites.length ? b.addFavs : ""}
          </div>
        )}
      </section>
    </>
  );
}
