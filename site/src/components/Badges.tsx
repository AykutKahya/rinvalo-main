"use client";

import { useEffect, useState } from "react";
import { dict, type Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type Record_ = { played: number; points: number; exact: number; results: number; streak: number; weeks: number };

/** Badge id and the test that earns it, in the order they are usually reached. */
const BADGES: [string, (r: Record_) => boolean][] = [
  ["first", (r) => r.played >= 1],
  ["sniper", (r) => r.exact >= 1],
  ["regular", (r) => r.played >= 10],
  ["streak", (r) => r.streak >= 5],
  ["weekly", (r) => r.weeks >= 1],
  ["sharp", (r) => r.exact >= 10],
  ["loyal", (r) => r.played >= 50],
];

/** The signed-in player's record and badges. */
export function Badges({ lang }: { lang: Lang }) {
  const t = dict(lang).badges;
  const [rec, setRec] = useState<Record_ | null>(null);

  useEffect(() => {
    supabase()
      ?.rpc("my_record")
      .then(({ data }) => setRec((data as Record_) ?? null));
  }, []);

  if (!rec) return null;
  return (
    <div className="badges">
      <div className="kv-grid four">
        {(
          [
            [t.points, rec.points],
            [t.played, rec.played],
            [t.exact, rec.exact],
            [t.streak, rec.streak],
          ] as const
        ).map(([label, v]) => (
          <div className="kv" key={label}>
            <small>{label}</small>
            <b>{v}</b>
          </div>
        ))}
      </div>
      <ul className="badge-list" aria-label={t.title}>
        {BADGES.map(([id, earned]) => {
          const on = earned(rec);
          const b = t.list[id as keyof typeof t.list];
          return (
            <li key={id} className={on ? "on" : undefined} title={b.how}>
              <b>{b.name}</b>
              <small>{on ? t.earned : b.how}</small>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
