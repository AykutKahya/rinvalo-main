"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fmt } from "@/lib/format";
import { dict, type Lang } from "@/lib/i18n";
import { leagueByCode } from "@/lib/leagues";
import { simulateLeague } from "@/lib/simulate";
import { team } from "@/lib/teams";
import type { Fixture, Prediction, TeamOutlook } from "@/lib/types";
import { Crest } from "./Crest";

/** As many runs as the published odds, from the same data: with no picks the two agree exactly. */
const RUNS = 5000;
type Pick = 0 | 1 | 2;

/** A prediction held to one result: the score grid outside that result is dropped. */
function forced(p: Prediction, pick: Pick): Prediction {
  const grid = p.grid.map((row, i) => row.map((v, j) => ((i > j ? 0 : i === j ? 1 : 2) === pick ? v : 0)));
  const s = grid.flat().reduce((a, b) => a + b, 0) || 1;
  return { ...p, grid: grid.map((row) => row.map((v) => v / s)) };
}

function readLink(): Record<string, Pick> {
  const raw = new URLSearchParams(window.location.search).get("lab");
  if (!raw) return {};
  return Object.fromEntries(
    raw
      .split(",")
      .map((x) => x.split("~"))
      .filter(([id, v]) => id && ["0", "1", "2"].includes(v))
      .map(([id, v]) => [id, Number(v) as Pick]),
  );
}

/** What the lab simulates, served by /lab/<code> and fetched once the tab is opened. */
export interface LabData {
  fixtures: Fixture[];
  predictions: Record<string, Prediction>;
}

const NONE: LabData = { fixtures: [], predictions: {} };

/**
 * League page "what if": pick results for games still to play and the season is simulated again
 * in the browser, next to the published season odds (`base`).
 */
export function ScenarioLab({ code, base, lang }: { code: string; base: TeamOutlook[]; lang: Lang }) {
  const ref = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<LabData | null>(null);
  // The tab is hidden until opened; the data (a season of score grids) loads only then.
  useEffect(() => {
    const el = ref.current;
    if (!el || data) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      fetch(`/lab/${code}`)
        .then((r) => (r.ok ? r.json() : NONE))
        .then(setData)
        .catch(() => setData(NONE));
    });
    io.observe(el);
    return () => io.disconnect();
  }, [code, data]);
  const { fixtures, predictions } = data ?? NONE;
  const t = dict(lang).lab;
  const o = dict(lang).outlook;
  const f = fmt(lang);
  const league = leagueByCode(code)!;
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [shown, setShown] = useState(2);
  const [result, setResult] = useState<TeamOutlook[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const upcoming = useMemo(() => fixtures.filter((x) => x.status !== "finished" && predictions[x.id]), [fixtures, predictions]);
  const rounds = useMemo(() => [...new Set(upcoming.map((x) => x.round))].sort((a, b) => a - b), [upcoming]);

  useEffect(() => {
    const fromLink = readLink();
    if (Object.keys(fromLink).length) {
      setPicks(fromLink);
      const last = Math.max(...upcoming.filter((x) => x.id in fromLink).map((x) => rounds.indexOf(x.round) + 1), 2);
      setShown(last);
    }
  }, [upcoming, rounds]);

  // Simulate after the click has painted; a season takes a moment on a phone.
  useEffect(() => {
    if (!Object.keys(picks).length) return setResult(null);
    setBusy(true);
    const id = setTimeout(() => {
      const preds = { ...predictions };
      for (const [fid, pick] of Object.entries(picks)) if (preds[fid]) preds[fid] = forced(preds[fid], pick);
      setResult(simulateLeague(league, fixtures, preds, RUNS).outlook);
      setBusy(false);
    }, 30);
    return () => clearTimeout(id);
  }, [picks, league, fixtures, predictions]);

  const toggle = (fid: string, v: Pick) =>
    setPicks((s) => {
      const n = { ...s };
      if (n[fid] === v) delete n[fid];
      else n[fid] = v;
      return n;
    });

  const share = async () => {
    const q = Object.entries(picks)
      .map(([id, v]) => `${id}~${v}`)
      .join(",");
    const url = `${window.location.origin}${window.location.pathname}${q ? `?lab=${q}` : ""}#senaryo`;
    history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const now = new Map((result ?? base).map((r) => [r.team, r]));
  const rows = [...base].sort((a, b) => now.get(a.team)!.avgPosition - now.get(b.team)!.avgPosition);
  // Points of percentage; relegation going up is bad news, so it is coloured the other way.
  const delta = (a: number, b: number, bad = false) => {
    const d = Math.round((b - a) * 100);
    if (!result || d === 0) return null;
    return <small className={(d > 0) !== bad ? "lab-d up" : "lab-d down"}>{d > 0 ? `+${d}` : `−${-d}`}</small>;
  };
  const cell = (v: number) => (v >= 0.995 ? f.pct(1) : v > 0 && v < 0.005 ? `<${f.pct(0.01)}` : f.pct(v));
  const name = (s: string) => team(s, lang).name;

  return (
    <div className="lab" ref={ref}>
      <div className="card card-pad lab-games">
        <div className="section-title" style={{ margin: 0 }}>
          <h2 style={{ fontSize: 15 }}>{t.games}</h2>
          <span className="lab-actions">
            {Object.keys(picks).length > 0 && (
              <>
                <button className="btn ghost" onClick={() => setPicks({})}>
                  {t.reset}
                </button>
                <button className="btn accent" onClick={share}>
                  {copied ? t.copied : t.share}
                </button>
              </>
            )}
          </span>
        </div>
        {!data && <p className="muted">{t.busy}</p>}
        {rounds.slice(0, shown).map((r) => (
          <div key={r}>
            <div className="lab-round">{dict(lang).round(r)}</div>
            {upcoming
              .filter((x) => x.round === r)
              .map((x) => (
                <div key={x.id} className="lab-row">
                  <span className="lab-teams">
                    <span className="tname">
                      <Crest slug={x.home} size="sm" />
                      {name(x.home)}
                    </span>
                    <span className="tname">
                      <Crest slug={x.away} size="sm" />
                      {name(x.away)}
                    </span>
                  </span>
                  <span className="seg lab-seg" role="group" aria-label={`${name(x.home)} – ${name(x.away)}`}>
                    {(["1", "X", "2"] as const).map((label, i) => (
                      <button key={label} aria-pressed={picks[x.id] === i} onClick={() => toggle(x.id, i as Pick)}>
                        {label}
                      </button>
                    ))}
                  </span>
                </div>
              ))}
          </div>
        ))}
        {shown < rounds.length && (
          <button className="more-row" onClick={() => setShown((n) => n + 2)}>
            {t.more}
          </button>
        )}
      </div>

      <div className="card card-pad lab-table" aria-busy={busy}>
        <div className="section-title" style={{ margin: 0 }}>
          <h2 style={{ fontSize: 15 }}>{busy ? t.busy : result ? t.after : t.before}</h2>
        </div>
        <div className="table-wrap">
          <table className="std">
            <thead>
              <tr>
                <th>{dict(lang).table.team}</th>
                <th className="c">{o.champion}</th>
                <th className="c">{o.top(league.zones.europe)}</th>
                <th className="c">{o.relegation}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const r = now.get(b.team)!;
                return (
                  <tr key={b.team}>
                    <td>
                      <span className="tname">
                        <Crest slug={b.team} size="sm" />
                        {name(b.team)}
                      </span>
                    </td>
                    <td className="c num">
                      {cell(r.champion)} {delta(b.champion, r.champion)}
                    </td>
                    <td className="c num">
                      {cell(r.europe)} {delta(b.europe, r.europe)}
                    </td>
                    <td className="c num">
                      {cell(r.relegation)} {delta(b.relegation, r.relegation, true)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
