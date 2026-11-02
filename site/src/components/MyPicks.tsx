"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/format";
import { dict, paths, type Lang } from "@/lib/i18n";
import { Pager, usePage } from "./Pager";

type Data = {
  names: Record<string, [string, string]>;
  /** id -> [kickoff, home, away, hg, ag, Rinvalo home goals, Rinvalo away goals] */
  fixtures: Record<string, [string, string, string, number | null, number | null, number | null, number | null]>;
};

const outcome = (h: number, a: number) => (h > a ? 0 : h === a ? 1 : 2);
/** Exact score 3, right result 1. */
function points(pick: [number, number] | null, h: number, a: number) {
  if (!pick) return 0;
  if (pick[0] === h && pick[1] === a) return 3;
  return outcome(pick[0], pick[1]) === outcome(h, a) ? 1 : 0;
}

export function MyPicks({ lang, cloud = {} }: { lang: Lang; cloud?: Record<string, [number, number]> }) {
  const t = dict(lang).myPicks;
  const f = fmt(lang);
  const p = paths(lang);
  const [guesses, setGuesses] = useState<Record<string, [number, number]> | null>(null);
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    try {
      setGuesses(JSON.parse(localStorage.getItem("rinvalo:guesses") ?? "{}"));
    } catch {
      setGuesses({});
    }
    fetch("/picks-data.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!guesses || !data) return <div className="card empty" style={{ minHeight: 240 }} />;
  const rows = Object.entries({ ...guesses, ...cloud })
    .filter(([id]) => data.fixtures[id])
    .map(([id, pick]) => {
      const [kickoff, home, away, hg, ag, rh, ra] = data.fixtures[id];
      const done = hg !== null && ag !== null;
      const rinvalo: [number, number] | null = rh !== null && ra !== null ? [rh, ra] : null;
      return { id, kickoff, home, away, hg, ag, pick, rinvalo, done, you: done ? points(pick, hg!, ag!) : 0, bot: done ? points(rinvalo, hg!, ag!) : 0 };
    })
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff));
  if (!rows.length) return <div className="card empty">{t.empty}</div>;

  const done = rows.filter((r) => r.done);
  const sum = (k: "you" | "bot") => done.reduce((s, r) => s + r[k], 0);
  const name = (s: string) => data.names[s]?.[lang === "en" ? 1 : 0] ?? s;

  return (
    <div className="stack">
      <div className="stat-row">
        <div className="card stat">
          <b>{sum("you")}</b>
          <span>
            {t.points} · {t.you}
          </span>
        </div>
        <div className="card stat">
          <b>{sum("bot")}</b>
          <span>{t.vsRinvalo}</span>
        </div>
        <div className="card stat">
          <b>{done.filter((r) => r.you === 3).length}</b>
          <span>{t.exact}</span>
        </div>
        <div className="card stat">
          <b>
            {done.length}/{rows.length}
          </b>
          <span>{t.played}</span>
        </div>
      </div>
      <PicksTable rows={rows} name={name} lang={lang} />
    </div>
  );
}

type PickRow = {
  id: string;
  kickoff: string;
  home: string;
  away: string;
  hg: number | null;
  ag: number | null;
  pick: [number, number];
  rinvalo: [number, number] | null;
  done: boolean;
  you: number;
  bot: number;
};

/** The picks, newest first, twenty to a page. */
function PicksTable({ rows, name, lang }: { rows: PickRow[]; name: (slug: string) => string; lang: Lang }) {
  const t = dict(lang).myPicks;
  const f = fmt(lang);
  const p = paths(lang);
  const pg = usePage(rows.length, 20);
  return (
    <section className="card card-pad">
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        {t.rule}
      </p>
      <div className="table-wrap">
        <table className="std">
          <thead>
            <tr>
              <th>{t.match}</th>
              <th className="c">{t.yours}</th>
              <th className="c">Rinvalo</th>
              <th className="c">{t.final}</th>
              <th className="c">{t.points}</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(pg.from, pg.to).map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={p.matchOf(r.id)} className="tname" style={{ flexDirection: "column", alignItems: "flex-start", gap: 0 }}>
                    <span>
                      {name(r.home)} – {name(r.away)}
                    </span>
                    <small className="muted">{f.fullDate(r.kickoff)}</small>
                  </Link>
                </td>
                <td className="c num">
                  <b>
                    {r.pick[0]}-{r.pick[1]}
                  </b>
                </td>
                <td className="c num muted">{r.rinvalo ? `${r.rinvalo[0]}-${r.rinvalo[1]}` : "–"}</td>
                <td className="c num">{r.done ? `${r.hg}-${r.ag}` : t.pending}</td>
                <td className={`c num ${r.done ? (r.you ? "up" : "down") : "muted"}`}>{r.done ? `${r.you} · ${r.bot}` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager {...pg} total={rows.length} onChange={pg.setPage} lang={lang} />
    </section>
  );
}
