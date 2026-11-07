"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dict, paths, type Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useAccount } from "./useAccount";

/** Home page invitation to the prediction league, or the player's points and season rank. */
export function PredictorCard({ lang }: { lang: Lang }) {
  const h = dict(lang).home;
  const p = paths(lang);
  const account = useAccount();
  const [mine, setMine] = useState<{ points: number; rank: number | null; model: number | null } | null>(null);

  useEffect(() => {
    const sb = supabase();
    if (!sb || !account.session || !account.username) return setMine(null);
    sb.rpc("my_standing").then(({ data }) => {
      // No row until the first of the player's picks is settled.
      const r = ((data as { points: number; rank: number; rinvalo: number | null }[]) ?? [])[0];
      setMine({ points: r?.points ?? 0, rank: r?.rank ?? null, model: r?.rinvalo ?? null });
    });
  }, [account.session, account.username]);

  if (!account.enabled) return null;
  return (
    <div className="card card-pad league-cta">
      <div className="section-title" style={{ margin: 0 }}>
        <h2 style={{ fontSize: 15 }}>{h.leagueCta}</h2>
      </div>
      {account.session ? (
        <div className="row">
          <b>{mine ? h.leagueMine(mine.points, mine.rank) : account.username}</b>
          <Link href={p.myPicks}>{h.leagueOpen}</Link>
        </div>
      ) : null}
      {account.session && mine && mine.model !== null ? (
        <p className="muted" style={{ margin: 0 }}>
          {h.leagueDuel(mine.points, mine.model)}
        </p>
      ) : null}
      {account.session ? null : (
        <>
          <p>{h.leagueText}</p>
          <Link href={`${p.myPicks}#account`} className="btn accent">
            {h.leagueJoin}
          </Link>
        </>
      )}
    </div>
  );
}
