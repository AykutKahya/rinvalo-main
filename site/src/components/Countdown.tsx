"use client";

import { useEffect, useState } from "react";
import { dict, type Lang } from "@/lib/i18n";

export function Countdown({ to, lang }: { to: string; lang: Lang }) {
  const t = dict(lang).countdown;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return <div className="countdown" style={{ minHeight: 48 }} />;
  const ms = Date.parse(to) - now;
  if (ms <= 0) return <span className="mh-label">{t.started}</span>;
  const s = Math.floor(ms / 1000);
  const parts = [
    [Math.floor(s / 86400), t.units[0]],
    [Math.floor((s % 86400) / 3600), t.units[1]],
    [Math.floor((s % 3600) / 60), t.units[2]],
    [s % 60, t.units[3]],
  ] as const;
  return (
    <div className="countdown" aria-label={t.aria}>
      {parts.map(([v, l]) => (
        <div key={l}>
          <b key={v} className="tick">
            {String(v).padStart(2, "0")}
          </b>
          <small>{l}</small>
        </div>
      ))}
    </div>
  );
}
