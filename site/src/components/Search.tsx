"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { dict, type Lang } from "@/lib/i18n";

export interface SearchItem {
  kind: "team" | "league" | "match";
  label: string;
  sub: string;
  href: string;
  img?: string;
  /** Background for white-only logos. */
  imgBg?: string;
}

/** Lower-case and strip Turkish/Latin accents so "fener", "FENERBAHÇE" and "fenerbahce" all match. */
function fold(s: string) {
  return s.toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function Search({ lang }: { lang: Lang }) {
  const t = dict(lang).search;
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const index = useMemo(() => items.map((it) => ({ it, key: fold(`${it.label} ${it.sub}`) })), [items]);

  const results = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean);
    if (!words.length) return items.filter((i) => i.kind === "league");
    return index
      .filter((x) => words.every((w) => x.key.includes(w)))
      .sort((a, b) => Number(!fold(a.it.label).startsWith(words[0])) - Number(!fold(b.it.label).startsWith(words[0])))
      .slice(0, 12)
      .map((x) => x.it);
  }, [q, index, items]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Load the index once the page is idle (or right away when the box opens), so results are ready.
  useEffect(() => {
    if (items.length) return;
    let done = false;
    const load = () => {
      if (done) return;
      done = true;
      fetch(lang === "en" ? "/en/search-index.json" : "/search-index.json")
        .then((r) => r.json())
        .then(setItems)
        .catch(() => (done = false));
    };
    if (open) load();
    const id = setTimeout(load, 2500);
    return () => clearTimeout(id);
  }, [open, items.length, lang]);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
    }
  }, [open]);

  function go(it: SearchItem | undefined) {
    if (!it) return;
    setOpen(false);
    router.push(it.href);
  }

  return (
    <>
      <button type="button" className="search-btn" onClick={() => setOpen(true)} aria-label={t.open} title={t.hint}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <span className="search-hint">{t.open}</span>
      </button>
      {open && (
        <div className="search-layer" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="search-box" role="dialog" aria-modal="true" aria-label={t.open}>
            <input
              ref={input}
              autoFocus
              value={q}
              placeholder={t.placeholder}
              aria-label={t.results}
              aria-controls="search-results"
              aria-activedescendant={results[sel] ? `sr-${sel}` : undefined}
              onChange={(e) => {
                setQ(e.target.value);
                setSel(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSel((s) => Math.min(s + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSel((s) => Math.max(s - 1, 0));
                } else if (e.key === "Enter") go(results[sel]);
              }}
            />
            <ul id="search-results" role="listbox" className="search-results">
              {results.map((it, i) => (
                <li key={it.href} id={`sr-${i}`} role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => go(it)}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local crest */}
                  {it.img ? <img src={it.img} alt="" width={22} height={22} style={it.imgBg ? { background: it.imgBg, borderRadius: 5, padding: 2 } : undefined} /> : <span className="sr-dot" />}
                  <span className="sr-text">
                    <b>{it.label}</b>
                    <small>{it.sub}</small>
                  </span>
                  <span className="sr-kind">{t.kind[it.kind]}</span>
                </li>
              ))}
              {!results.length && <li className="sr-empty">{items.length ? t.none : t.loading}</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
