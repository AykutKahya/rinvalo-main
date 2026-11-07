"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CompareData, CompareTeam } from "@/lib/compare";
import { fmt } from "@/lib/format";
import { fixtureId } from "@/lib/leagues";
import { withBrand } from "./Brand";
import { dict, paths, type Lang } from "@/lib/i18n";

type Metric<T = CompareTeam> = { key: string; label: string; get: (t: T) => number | null; show: (v: number) => string; lowerIsBetter?: boolean; base?: number };

function MetricRow<T>({ m, A, B }: { m: Metric<T>; A: T; B: T }) {
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
    <div className="cmp-row">
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
}

type Form = { n: number; ppg: number | null; gf: number | null; ga: number | null; w: number; d: number; l: number; home: number | null; away: number | null };

/** Results over the last n league games (0 = this season). */
function formOf(t: CompareTeam, n: number): Form {
  const list = n ? t.games.slice(-n) : t.games.slice(t.games.length - t.season);
  const pts = (g: [number, number, number]) => (g[1] > g[2] ? 3 : g[1] === g[2] ? 1 : 0);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  return {
    n: list.length,
    ppg: avg(list.map(pts)),
    gf: avg(list.map((g) => g[1])),
    ga: avg(list.map((g) => g[2])),
    w: list.filter((g) => g[1] > g[2]).length,
    d: list.filter((g) => g[1] === g[2]).length,
    l: list.filter((g) => g[1] < g[2]).length,
    home: avg(list.filter((g) => g[0] === 1).map(pts)),
    away: avg(list.filter((g) => g[0] === 0).map(pts)),
  };
}

/** 1-X-2 from the shared rating scale; `home` is the home side's edge in rating points. */
function meet(model: NonNullable<CompareData["model"]>, ra: number, rb: number, home: number): [number, number, number] {
  const z = model.coef.map((c, i) => Math.exp((c * (ra - rb + home)) / 100 + model.intercept[i]));
  const s = z[0] + z[1] + z[2];
  return [z[0] / s, z[1] / s, z[2] / s];
}

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
  const [win, setWin] = useState(5);

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
    .map(([h, w]) => ({ id: fixtureId(h, w), home: h, away: w, fx: data.fixtures[fixtureId(h, w)] }))
    .filter((x) => x.fx)
    .sort((x, y) => x.fx[0].localeCompare(y.fx[0]));
  const name = (s: string) => data.teams.find((x) => x.slug === s)?.name[lang] ?? s;
  const fa = formOf(A, win);
  const fb = formOf(B, win);
  const formRows: Metric<Form>[] = [
    { key: "ppg", label: t.ppg, get: (x) => x.ppg, show: (v) => f.dec(v, 2) },
    { key: "gf", label: t.gfpg, get: (x) => x.gf, show: (v) => f.dec(v, 2) },
    { key: "ga", label: t.gapg, get: (x) => x.ga, show: (v) => f.dec(v, 2), lowerIsBetter: true },
    { key: "home", label: t.homePpg, get: (x) => x.home, show: (v) => f.dec(v, 2) },
    { key: "away", label: t.awayPpg, get: (x) => x.away, show: (v) => f.dec(v, 2) },
  ];
  const meetings3 =
    data.model && A.shared !== null && B.shared !== null
      ? ([
          [t.neutral, 0],
          [t.atHome(A.name[lang]), data.model.home],
          [t.atHome(B.name[lang]), -data.model.home],
        ] as const).map(([label, home], i) => {
          // A real game still to play between them shows the match page's own prediction.
          const real = i === 1 ? data.fixtures[fixtureId(A.slug, B.slug)]?.[5] : i === 2 ? data.fixtures[fixtureId(B.slug, A.slug)]?.[5] : null;
          return { label, p: real ?? meet(data.model!, A.shared!, B.shared!, home) };
        })
      : [];

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
          {metrics.map((m) => (
            <MetricRow key={m.key} m={m} A={A} B={B} />
          ))}
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
          {meetings3.length > 0 && (
            <section className="card card-pad">
              <div className="section-title">
                <h2 style={{ fontSize: 16 }}>{t.ifMet}</h2>
              </div>
              <div className="cmp-meet">
                {meetings3.map(({ label, p: q }) => (
                  <div key={label}>
                    <div className="cmp-meet-top">
                      <span>{label}</span>
                      <span className="num">
                        1 {f.pct(q[0])} · X {f.pct(q[1])} · 2 {f.pct(q[2])}
                      </span>
                    </div>
                    <div className="pbar" aria-hidden="true">
                      <span className="h" style={{ width: `${q[0] * 100}%` }} />
                      <span className="d" style={{ width: `${q[1] * 100}%` }} />
                      <span className="a" style={{ width: `${q[2] * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
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

      <section className="card card-pad cmp-rows">
        <div className="section-title" style={{ margin: 0 }}>
          <h2 style={{ fontSize: 16 }}>{t.recent}</h2>
          <span className="seg cmp-win" role="tablist">
            {[5, 10, 20, 0].map((n) => (
              <button key={n} role="tab" aria-selected={win === n} onClick={() => setWin(n)}>
                {n ? t.lastN(n) : t.season}
              </button>
            ))}
          </span>
        </div>
        <div className="cmp-row">
          <b className="num">{`${fa.w}-${fa.d}-${fa.l}`}</b>
          <div className="cmp-mid">
            <span>{t.record}</span>
          </div>
          <b className="num">{`${fb.w}-${fb.d}-${fb.l}`}</b>
        </div>
        {formRows.map((m) => (
          <MetricRow key={m.key} m={m} A={fa} B={fb} />
        ))}
      </section>
    </div>
  );
}
