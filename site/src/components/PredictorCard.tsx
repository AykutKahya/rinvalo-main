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
  const [mine, setMine] = useState<{ points: number; rank: number | null } | null>(null);

  useEffect(() => {
    const sb = supabase();
    if (!sb || !account.session || !account.username) return setMine(null);
    sb.rpc("leaderboard", { since: null, max_rows: 500 }).then(({ data }) => {
      const rows = (data as { username: string; points: number }[]) ?? [];
      const i = rows.findIndex((r) => r.username === account.username);
      setMine({ points: i >= 0 ? rows[i].points : 0, rank: i >= 0 ? i + 1 : null });
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
      ) : (
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
