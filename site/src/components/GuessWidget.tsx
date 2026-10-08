"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dict, paths, type Lang } from "@/lib/i18n";

const KEY = "rinvalo:guesses";

type Guesses = Record<string, [number, number]>;

function load(): Guesses {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Guesses;
  } catch {
    return {};
  }
}

function outcome(h: number, a: number) {
  return h > a ? 0 : h === a ? 1 : 2;
}

/** "Sen de tahmin et": the visitor's guess, kept in their browser, scored against the model. */
export function GuessWidget(props: {
  id: string;
  home: string;
  away: string;
  kickoff: string;
  model: [number, number] | null;
  actual: [number, number] | null;
  lang: Lang;
}) {
  const { id, home, away, kickoff, model, actual, lang } = props;
  const t = dict(lang).guess;
  const [h, setH] = useState(1);
  const [a, setA] = useState(1);
  const [saved, setSaved] = useState<[number, number] | null>(null);
  const [ready, setReady] = useState(false);
  const locked = actual !== null || (ready && Date.now() > Date.parse(kickoff));

  useEffect(() => {
    const g = load()[id];
    if (g) {
      setSaved(g);
      setH(g[0]);
      setA(g[1]);
    }
    setReady(true);
  }, [id]);

  function save() {
    const all = load();
    all[id] = [h, a];
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {}
    setSaved([h, a]);
  }

  const stepper = (value: number, set: (n: number) => void, label: string) => (
    <div className="stepper">
      <button type="button" onClick={() => set(Math.min(value + 1, 9))} disabled={locked} aria-label={t.up(label)}>
        +
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => set(Math.max(value - 1, 0))} disabled={locked} aria-label={t.down(label)}>
        −
      </button>
    </div>
  );

  let verdict: string | null = null;
  if (actual && saved) {
    const you = saved[0] === actual[0] && saved[1] === actual[1] ? t.exact : outcome(...saved) === outcome(...actual) ? t.result : null;
    const bot = model && model[0] === actual[0] && model[1] === actual[1] ? t.exact : model && outcome(...model) === outcome(...actual) ? t.result : null;
    verdict = `${t.you}: ${you ? `${you} ✓` : t.miss} · Rinvalo: ${bot ? `${bot} ✓` : t.miss}`;
  }

  return (
    <div className="card card-pad guess">
      <div className="section-title" style={{ margin: 0 }}>
        <h2 style={{ fontSize: 16 }}>{t.title}</h2>
        {saved && !actual && <span className="pill good">{t.saved}</span>}
      </div>
      <div className="guess-row">
        <span className="guess-team">{home}</span>
        {stepper(h, setH, home)}
        <span className="muted" style={{ fontSize: 24, fontWeight: 700 }}>
          –
        </span>
        {stepper(a, setA, away)}
        <span className="guess-team">{away}</span>
      </div>
      {locked ? (
        <p className="muted" style={{ margin: 0, fontSize: 13.5, textAlign: "center" }}>
          {verdict ?? (saved ? t.yours(`${saved[0]}-${saved[1]}`) : t.closed)}
        </p>
      ) : (
        <>
          <button className="btn accent" type="button" onClick={save}>
            {saved ? t.update : t.save}
          </button>
          <p className="muted" style={{ margin: 0, fontSize: 12.5, textAlign: "center" }}>
            {model ? `Rinvalo: ${model[0]}-${model[1]}` : ""}
          </p>
        </>
      )}
      {saved && (
        <Link href={paths(lang).myPicks} className="guess-all">
          {dict(lang).myPicks.link}
        </Link>
      )}
    </div>
  );
}
