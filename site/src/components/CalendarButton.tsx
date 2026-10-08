"use client";

import { useEffect, useRef, useState } from "react";
import { dict, type Lang } from "@/lib/i18n";

/** Subscribe to a club's fixtures: Google Calendar, Apple Calendar (webcal) or a copied link. */
export function CalendarButton({ slug, lang }: { slug: string; lang: Lang }) {
  const t = dict(lang).calendar;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setUrl(`${window.location.origin}/cal/${lang}/${slug}.ics`), [slug, lang]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const webcal = url.replace(/^https?:/, "webcal:");
  return (
    <div className="cal" ref={box}>
      <button type="button" className="btn ghost" aria-expanded={open} onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        {t.button}
      </button>
      {open && (
        <div className="cal-menu" role="menu">
          <a role="menuitem" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noopener noreferrer">
            {t.google}
          </a>
          <a role="menuitem" href={webcal}>
            {t.apple}
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {}
            }}
          >
            {copied ? t.copied : t.copy}
          </button>
          <small>{t.note}</small>
        </div>
      )}
    </div>
  );
}
