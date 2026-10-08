"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dict, paths, switchPath, type Lang } from "@/lib/i18n";

const ICONS = {
  matches: "M4 6h16M4 12h16M4 18h10",
  leagues: "M5 4h14v4a7 7 0 0 1-14 0zM9 20h6M12 15v5",
  analysis: "M4 19V9M10 19V5M16 19v-7M22 19H2",
  headlines: "M4 5h12v14H6a2 2 0 0 1-2-2zM16 9h4v8a2 2 0 0 1-4 0M7 9h6M7 13h6",
};

function links(lang: Lang) {
  const p = paths(lang);
  const t = dict(lang).nav;
  return [
    { key: "matches", href: p.home, label: t.matches, also: [p.match] },
    { key: "leagues", href: p.leagues, label: t.leagues, also: [p.league, p.team] },
    { key: "analysis", href: p.analysis, label: t.analysis, also: [] },
    { key: "headlines", href: p.headlines, label: t.headlines, also: [] },
  ] as const;
}

function active(path: string, l: ReturnType<typeof links>[number]) {
  if (path === l.href) return true;
  if (l.key === "matches") return l.also.some((b) => path.startsWith(`${b}/`));
  return [l.href, ...l.also].some((b) => path.startsWith(`${b}/`) || path === b);
}

export function TopNav({ lang }: { lang: Lang }) {
  const path = usePathname();
  return (
    <nav className="nav" aria-label={dict(lang).nav.main}>
      {links(lang).map((l) => (
        <Link key={l.key} href={l.href} className={l.key === "headlines" ? "manset-link" : undefined} aria-current={active(path, l) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav({ lang }: { lang: Lang }) {
  const path = usePathname();
  return (
    <nav className="bottombar" aria-label={dict(lang).nav.bottom}>
      {links(lang).map((l) => (
        <Link key={l.key} href={l.href} aria-current={active(path, l) ? "page" : undefined}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={ICONS[l.key]} />
          </svg>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

/** TR ⇄ EN, landing on the same page in the other language. */
export function LangSwitch({ lang }: { lang: Lang }) {
  const path = usePathname();
  const other: Lang = lang === "tr" ? "en" : "tr";
  const t = dict(lang).langSwitch;
  return (
    <a href={switchPath(path, other)} className="lang-switch" hrefLang={other} lang={other} title={t.title} aria-label={t.label}>
      {t.short}
    </a>
  );
}
