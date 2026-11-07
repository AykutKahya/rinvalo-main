"use client";

import { useEffect, useState } from "react";

/** A sticky strip of the page's sections, so a visitor sees at once what the page holds. */
export function SectionNav({ items, label }: { items: { id: string; label: string }[]; label: string }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    const onScroll = () => {
      // The last section whose top has passed just under the bars is the one being read.
      let cur = els[0]?.id;
      for (const el of els) if (el.getBoundingClientRect().top < 140) cur = el.id;
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items]);

  // Keep the active pill visible on narrow screens.
  useEffect(() => {
    const el = document.getElementById(`sn-${active}`);
    const strip = el?.parentElement;
    if (el && strip && strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: el.offsetLeft - 16, behavior: "smooth" });
  }, [active]);

  if (items.length < 2) return null;
  return (
    <nav className="secnav" aria-label={label}>
      <div>
        {items.map((i) => (
          <a
            key={i.id}
            id={`sn-${i.id}`}
            href={`#${i.id}`}
            aria-current={i.id === active ? "true" : undefined}
            onClick={() => {
              const el = document.getElementById(i.id);
              if (el instanceof HTMLDetailsElement) el.open = true;
            }}
          >
            {i.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
