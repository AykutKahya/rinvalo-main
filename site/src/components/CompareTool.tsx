"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CompareData, CompareTeam } from "@/lib/compare";
import { fmt } from "@/lib/format";
import { withBrand } from "./Brand";
import { dict, paths, type Lang } from "@/lib/i18n";

type Metric = { key: string; label: string; get: (t: CompareTeam) => number | null; show: (v: number) => string; lowerIsBetter?: boolean; base?: number };

function Picker({ data, value, onChange, lang, label }: { data: CompareData; value: string; onChange: (s: string) => void; lang: Lang; label: string }) {
  const t = data.teams.find((x) => x.slug === value);
  return (
    <div className="cmp-pick">
      {t?.crest ? (
        // eslint-disable-next-line @next/next/no-img-element -- local crest
        <img src={t.crest} alt="" width={64} height={64} />
      ) : (
        <span className="cmp-dot" style={{ background: t?.color }} />
      )}
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {data.leagues.map((l) => (
          <optgroup key={l.code} label={l.name}>
            {data.teams
              .filter((x) => x.league === l.code)
              .sort((a, b) => a.name[lang].localeCompare(b.name[lang], lang))
              .map((x) => (
                <option key={x.slug} value={x.slug}>
                  {x.name[lang]}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      {t && <small>{data.leagues.find((l) => l.code === t.league)?.name}</small>}
    </div>
  );
}

export function CompareTool({ lang }: { lang: Lang }) {
  const d = dict(lang);
  const t = d.compare;
  const f = fmt(lang);
  const p = paths(lang);
  const [data, setData] = useState<CompareData | null>(null);
  const [a, setA] = useState("galatasaray");
  const [b, setB] = useState("fenerbahce");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("a")) setA(q.get("a")!);
    if (q.get("b")) setB(q.get("b")!);
    fetch("/compare-data.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const q = new URLSearchParams({ a, b });
    history.replaceState(null, "", `${window.location.pathname}?${q}`);
  }, [a, b]);

  const metrics: Metric[] = useMemo(
    () => [
      { key: "elo", label: t.rating, get: (x) => x.elo, show: (v) => String(v), base: 1250 },
      { key: "pos", label: t.position, get: (x) => x.pos, show: (v) => `${v}.`, lowerIsBetter: true },
      { key: "pts", label: t.points, get: (x) => x.points, show: (v) => String(v) },
      { key: "gf", label: t.attack, get: (x) => x.gf, show: (v) => f.dec(v, 2) },
      { key: "ga", label: t.defence, get: (x) => x.ga, show: (v) => f.dec(v, 2), lowerIsBetter: true },
      { key: "xgf", label: t.xgf, get: (x) => x.xgf, show: (v) => f.dec(v, 2) },
      { key: "xga", label: t.xga, get: (x) => x.xga, show: (v) => f.dec(v, 2), lowerIsBetter: true },
      { key: "xpts", label: t.xpts, get: (x) => x.xpts, show: (v) => f.dec(v) },
      { key: "champion", label: t.title_, get: (x) => x.champion, show: (v) => f.pct(v) },
      { key: "europe", label: t.top, get: (x) => x.europe, show: (v) => f.pct(v) },
      { key: "relegation", label: t.relegation, get: (x) => x.relegation, show: (v) => f.pct(v), lowerIsBetter: true },
    ],
    [t, f],
  );

  if (!data) return <div className="card empty" style={{ minHeight: 420 }} />;
  const A = data.teams.find((x) => x.slug === a) ?? data.teams[0];
  const B = data.teams.find((x) => x.slug === b) ?? data.teams[1];
  const sameLeague = A.league === B.league;
  // Fixture ids are "home-away", so the two league meetings can be looked up directly.
  const meetings = [
    [A.slug, B.slug],
    [B.slug, A.slug],
  ]
    .map(([h, w]) => ({ id: `${h}-${w}`, home: h, away: w, fx: data.fixtures[`${h}-${w}`] }))
    .filter((x) => x.fx)
    .sort((x, y) => x.fx[0].localeCompare(y.fx[0]));
  const name = (s: string) => data.teams.find((x) => x.slug === s)?.name[lang] ?? s;

  return (
    <div className="stack">
      <div className="card cmp-head">
        <Picker data={data} value={A.slug} onChange={setA} lang={lang} label={`${t.pick} 1`} />
        <button
          type="button"
          className="cmp-swap"
          onClick={() => {
            setA(B.slug);
            setB(A.slug);
          }}
          aria-label={t.swap}
          title={t.swap}
        >
          ⇄
        </button>
        <Picker data={data} value={B.slug} onChange={setB} lang={lang} label={`${t.pick} 2`} />
      </div>

      <div className="match-grid" style={{ marginTop: 0 }}>
        <section className="card card-pad cmp-rows">
          {metrics.map((m) => {
            const va = m.get(A);
            const vb = m.get(B);
            if (va === null && vb === null) return null;
            // Bars show each side's share; for "lower is better" metrics the smaller value gets the longer bar.
            // Ratings sit around 1500, so measure bars from a floor or every pair looks 50/50.
            const sa = Math.max((va ?? 0) - (m.base ?? 0), 0);
            const sb = Math.max((vb ?? 0) - (m.base ?? 0), 0);
            const wa = m.lowerIsBetter ? sb : sa;
            const wb = m.lowerIsBetter ? sa : sb;
            const total = wa + wb || 1;
            const better = va === null || vb === null || va === vb ? 0 : (m.lowerIsBetter ? va < vb : va > vb) ? -1 : 1;
            return (
              <div key={m.key} className="cmp-row">
                <b className={better === -1 ? "win" : undefined}>{va === null ? "–" : m.show(va)}</b>
                <div className="cmp-mid">
                  <span>{m.label}</span>
                  <div className="cmp-bars" aria-hidden="true">
                    <i className="ca" style={{ width: `${(wa / total) * 100}%` }} />
                    <i className="cb" style={{ width: `${(wb / total) * 100}%` }} />
                  </div>
                </div>
                <b className={better === 1 ? "win" : undefined}>{vb === null ? "–" : m.show(vb)}</b>
              </div>
            );
          })}
          <div className="cmp-row">
            <span className="form">
              {A.form.map((x, i) => (
                <i key={i} className={x}>
                  {d.form[x as "G" | "B" | "M"]}
                </i>
              ))}
            </span>
            <div className="cmp-mid">
              <span>{t.form}</span>
            </div>
            <span className="form" style={{ justifyContent: "flex-end" }}>
              {B.form.map((x, i) => (
                <i key={i} className={x}>
                  {d.form[x as "G" | "B" | "M"]}
                </i>
              ))}
            </span>
          </div>
          {!sameLeague && <p className="muted cmp-note">{t.otherLeague}</p>}
        </section>

        <aside className="stack">
          <section className="card card-pad">
            <div className="section-title">
              <h2 style={{ fontSize: 16 }}>{t.meeting}</h2>
            </div>
            {meetings.length ? (
              <div className="mini-list">
                {meetings.map(({ id, home, away, fx }) => (
                  <Link key={id} href={p.matchOf(id)} className="mini-item">
                    <span className="mi-t">
                      {name(home)} – {name(away)}
                      <br />
                      <small className="muted">{f.fullDate(fx[0])}</small>
                    </span>
                    {fx[1] !== null ? (
                      <b className="num">
                        {fx[1]}-{fx[2]}
                      </b>
                    ) : (
                      <span className="cmp-pred">
                        <small>{withBrand(d.match.prediction)}</small>
                        <b className="num">{fx[3] !== null ? `${fx[3]}-${fx[4]}` : "–"}</b>
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
                {t.noMeeting}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
