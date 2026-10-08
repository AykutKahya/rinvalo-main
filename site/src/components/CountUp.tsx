"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up from zero when it scrolls into view. The server renders the final value,
 * so the page is complete without JavaScript and for reduced-motion visitors.
 */
export function CountUp({ value, kind = "pct", digits = 0 }: { value: number; kind?: "pct" | "int"; digits?: number }) {
  const target = kind === "pct" ? value * 100 : value;
  const [shown, setShown] = useState(target);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const dur = 900;
        const step = (t: number) => {
          const k = Math.min((t - start) / dur, 1);
          setShown(target * (1 - Math.pow(1 - k, 3)));
          if (k < 1) raf = requestAnimationFrame(step);
        };
        setShown(0);
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target]);

  const text = shown.toFixed(digits).replace(".", ",");
  return (
    <span ref={ref} className="num">
      {kind === "pct" ? `%${text}` : text}
    </span>
  );
}
