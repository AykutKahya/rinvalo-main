"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { LiveOdds } from "./LiveOdds";
import { inPlayWindow, useLive } from "./useLive";

/** On a match page: asks for the live score while the game is on and shows in-play odds. */
export function LiveMatch(props: { id: string; kickoff: string; lh: number; la: number; status: string; hg: number | null; ag: number | null; home: string; away: string; lang: Lang }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const active = now !== null && (props.status === "live" || inPlayWindow(props.kickoff, now));
  const live = useLive(active)[props.id];
  const status = live?.status ?? props.status;
  const hg = live ? live.hg : props.hg;
  const ag = live ? live.ag : props.ag;
  if (status !== "live" || hg === null || ag === null) return null;
  return <LiveOdds kickoff={props.kickoff} lh={props.lh} la={props.la} hg={hg} ag={ag} home={props.home} away={props.away} lang={props.lang} />;
}
