"use client";

import { useEffect, useState } from "react";
import { fmt } from "@/lib/format";
import { dict, type Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { Pager, usePage } from "./Pager";

export type Row = {
  username: string;
  points: number;
  exact: number;
  results: number;
  played: number;
};
export type Period = "week" | "month" | "season";

export function since(p: Period): string | null {
  const d = new Date();
  if (p === "week") d.setDate(d.getDate() - 7);
  else if (p === "month") d.setDate(d.getDate() - 30);
  else return null;
  return d.toISOString();
}

/** League standings over settled games, from the database. */
export function Leaderboard({ lang, me }: { lang: Lang; me: string | null }) {
  const t = dict(lang).league2;
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
        <PeriodPicker period={period} onChange={setPeriod} lang={lang} />
      </div>
      <BoardTable rows={rows} me={me} lang={lang} />
    </section>
  );
}

export function PeriodPicker({ period, onChange, lang }: { period: Period; onChange: (p: Period) => void; lang: Lang }) {
  const t = dict(lang).league2;
  return (
    <div className="seg" role="tablist">
      {(["week", "month", "season"] as Period[]).map((p) => (
        <button key={p} role="tab" aria-selected={period === p} onClick={() => onChange(p)}>
          {t[p]}
        </button>
      ))}
    </div>
  );
}

/** Points table shared by the public standings and friend leagues. */
export function BoardTable({ rows, me, lang }: { rows: Row[] | null; me: string | null; lang: Lang }) {
  const t = dict(lang).league2;
  const f = fmt(lang);
  const pg = usePage(rows?.length ?? 0, 25);
  return (
    <>
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
              {rows.slice(pg.from, pg.to).map((r, i) => (
                <tr key={r.username} className={r.username === me ? "hl" : undefined}>
                  <td className="c num">{pg.from + i + 1}</td>
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
          <Pager {...pg} total={rows.length} onChange={pg.setPage} lang={lang} />
        </div>
      ) : (
        <div className="empty">{t.empty}</div>
      )}
    </>
  );
}
