import Link from "next/link";
import { dict, paths, type Lang } from "@/lib/i18n";

type Page = "analysis" | "accuracy" | "power" | "surprises" | "compare";

/** The analysis pages, side by side, with the current one marked. */
export function AnalysisNav({ current, lang }: { current: Page; lang: Lang }) {
  const p = paths(lang);
  const t = dict(lang).secnav.analysis;
  const pages: [Page, string][] = [
    ["analysis", t.hub],
    ["accuracy", t.accuracy],
    ["power", t.power],
    ["surprises", t.surprises],
    ["compare", t.compare],
  ];
  return (
    <nav className="subnav" aria-label={dict(lang).nav.analysis}>
      {pages.map(([k, label]) => (
        <Link key={k} href={p[k]} aria-current={k === current ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
