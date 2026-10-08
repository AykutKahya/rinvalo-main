"use client";

import { useEffect, useState, type ReactNode } from "react";

export function Tabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0].id);
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      if (tabs.some((t) => t.id === h)) setActive(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [tabs]);

  // On narrow screens the tab strip scrolls; keep the active tab in view.
  useEffect(() => {
    const el = document.getElementById(`tab-${active}`);
    const strip = el?.parentElement;
    if (el && strip && strip.scrollWidth > strip.clientWidth) strip.scrollLeft = el.offsetLeft - strip.offsetLeft - 16;
  }, [active]);

  return (
    <div>
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={t.id === active}
            aria-controls={`panel-${t.id}`}
            onClick={() => {
              setActive(t.id);
              history.replaceState(null, "", `#${t.id}`);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={t.id !== active} className="reveal">
          {t.content}
        </div>
      ))}
    </div>
  );
}
