"use client";

import { useEffect, useState } from "react";
import { dict, type Lang } from "@/lib/i18n";

const KEY = "rinvalo:theme";

function effectiveTheme(): "light" | "dark" {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Day/night switch. Starts from the device theme; a choice is remembered in this browser. */
export function ThemeToggle({ lang }: { lang: Lang }) {
  const t = dict(lang).theme;
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => setTheme(effectiveTheme()), []);

  function toggle() {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    setTheme(next);
  }

  const dark = theme === "dark";
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={dark ? t.toDay : t.toNight} title={dark ? t.day : t.night}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
        )}
      </svg>
    </button>
  );
}
