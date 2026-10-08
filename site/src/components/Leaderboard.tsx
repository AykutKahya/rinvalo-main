"use client";

import { useEffect, useState } from "react";
import { fmt } from "@/lib/format";
import { dict, type Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type Row = { username: string; points: number; exact: number; results: number; played: number };
type Period = "week" | "month" | "season";

function since(p: Period): string | null {
  const d = new Date();
  if (p === "week") d.setDate(d.getDate() - 7);
  else if (p === "month") d.setDate(d.getDate() - 30);
  else return null;
  return d.toISOString();
}

/** League standings over settled games, from the database. */
export function Leaderboard({ lang, me }: { lang: Lang; me: string | null }) {
  const t = dict(lang).league2;
  const f = fmt(lang);
  const [period, setPeriod] = useState<Period>("week");
  const [rows, setRows] = useState<Row[] | null>(null);
  const sb = supabase();

  useEffect(() => {
    if (!sb) return;
    setRows(null);
    sb.rpc("leaderboard", { since: since(period), max_rows: 100 }).then(({ data }) => setRows((data as Row[]) ?? []));
  }, [sb, period]);

  if (!sb) return <div className="card empty">{t.off}</div>;
  return (
    <section className="card card-pad">
      <div className="section-title" style={{ margin: 0 }}>
        <h2 style={{ fontSize: 16 }}>{t.standings}</h2>
        <div className="seg" role="tablist">
          {(["week", "month", "season"] as Period[]).map((p) => (
            <button key={p} role="tab" aria-selected={period === p} onClick={() => setPeriod(p)}>
              {t[p]}
            </button>
          ))}
        </div>
      </div>
      {rows === null ? (
        <div className="empty" style={{ minHeight: 120 }} />
      ) : rows.length ? (
        <div className="table-wrap">
          <table className="std">
            <thead>
              <tr>
                <th className="c">#</th>
                <th>{t.player}</th>
                <th className="c">{t.points}</th>
                <th className="c">{t.exact}</th>
                <th className="c">{t.results}</th>
                <th className="c">{t.played}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.username} className={r.username === me ? "hl" : undefined}>
                  <td className="c num">{i + 1}</td>
                  <td>
                    <b>{r.username}</b>
                  </td>
                  <td className="c num">
                    <b>{f.int(r.points)}</b>
                  </td>
                  <td className="c num">{r.exact}</td>
                  <td className="c num">{r.results}</td>
                  <td className="c num muted">{r.played}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">{t.empty}</div>
      )}
    </section>
  );
}
