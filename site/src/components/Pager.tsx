"use client";

import { useEffect, useState, type ReactNode } from "react";
import { dict, type Lang } from "@/lib/i18n";

/** Page state for a list of `n` items, `per` to a page; resets when the list changes length. */
export function usePage(n: number, per: number) {
  const pages = Math.max(1, Math.ceil(n / per));
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [n]);
  const at = Math.min(page, pages - 1);
  return { page: at, pages, from: at * per, to: Math.min(n, (at + 1) * per), setPage };
}

/** "‹ 1 2 3 … 9 ›" with "11–20 / 87"; hidden when everything fits on one page. */
export function Pager({
  page,
  pages,
  from,
  to,
  total,
  onChange,
  lang,
}: {
  page: number;
  pages: number;
  from: number;
  to: number;
  total: number;
  onChange: (p: number) => void;
  lang: Lang;
}) {
  if (pages <= 1) return null;
  const t = dict(lang).pager;
  // First, last, and the current page with one neighbour each side.
  const shown = [...new Set([0, page - 1, page, page + 1, pages - 1])].filter((p) => p >= 0 && p < pages).sort((a, b) => a - b);
  return (
    <nav className="pager" aria-label={t.label}>
      <button type="button" onClick={() => onChange(page - 1)} disabled={page === 0} aria-label={t.prev}>
        ‹
      </button>
      {shown.map((p, i) => (
        <span key={p} style={{ display: "contents" }}>
          {i > 0 && p - shown[i - 1] > 1 && <span className="pager-gap">…</span>}
          <button type="button" onClick={() => onChange(p)} aria-current={p === page ? "page" : undefined}>
            {p + 1}
          </button>
        </span>
      ))}
      <button type="button" onClick={() => onChange(page + 1)} disabled={page === pages - 1} aria-label={t.next}>
        ›
      </button>
      <span className="pager-count">{t.count(from + 1, to, total)}</span>
    </nav>
  );
}

/** A server-rendered list shown one page at a time. */
export function Paged({ items, per = 15, lang, empty }: { items: ReactNode[]; per?: number; lang: Lang; empty?: ReactNode }) {
  const pg = usePage(items.length, per);
  if (items.length === 0) return <>{empty ?? null}</>;
  return (
    <>
      {items.slice(pg.from, pg.to)}
      <Pager {...pg} total={items.length} onChange={pg.setPage} lang={lang} />
    </>
  );
}
