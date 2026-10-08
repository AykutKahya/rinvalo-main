"use client";

import { useEffect, useState } from "react";
import type { LiveScore } from "@/lib/liveFeed";

/** Polls /live.json every minute while `active`; returns the latest scores by fixture id. */
export function useLive(active: boolean): Record<string, LiveScore> {
  const [scores, setScores] = useState<Record<string, LiveScore>>({});
  useEffect(() => {
    if (!active) return;
    let stop = false;
    const load = () =>
      fetch("/live.json")
        .then((r) => (r.ok ? r.json() : {}))
        .then((d) => !stop && setScores(d))
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [active]);
  return scores;
}

/** Kicked off (or about to) within the last three hours: worth asking for a live score. */
export function inPlayWindow(kickoff: string, now: number) {
  const k = Date.parse(kickoff);
  return k < now + 5 * 60_000 && k > now - 3 * 3600_000;
}
