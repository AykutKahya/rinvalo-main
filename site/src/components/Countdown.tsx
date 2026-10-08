"use client";

import { useEffect, useState } from "react";

export function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return <div className="countdown" style={{ minHeight: 48 }} />;
  const ms = Date.parse(to) - now;
  if (ms <= 0) return <span className="mh-label">Maç başladı</span>;
  const s = Math.floor(ms / 1000);
  const parts = [
    [Math.floor(s / 86400), "gün"],
    [Math.floor((s % 86400) / 3600), "saat"],
    [Math.floor((s % 3600) / 60), "dk"],
    [s % 60, "sn"],
  ] as const;
  return (
    <div className="countdown" aria-label="Maça kalan süre">
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
