"use client";

import { useEffect, useState } from "react";
import { dict, type Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { AccountPanel } from "./AccountPanel";
import { Groups } from "./Groups";
import { Leaderboard } from "./Leaderboard";
import { MyPicks } from "./MyPicks";
import { useAccount } from "./useAccount";

type Tab = "standings" | "groups" | "mine" | "account";

/** Prediction league: standings, the visitor's picks, and their account, on one page. */
export function LeagueHub({ lang }: { lang: Lang }) {
  const t = dict(lang).league2;
  const account = useAccount();
  const [tab, setTab] = useState<Tab>("standings");
  const [cloud, setCloud] = useState<Record<string, [number, number]>>({});

  useEffect(() => {
    const h = window.location.hash.slice(1) as Tab;
    if (["standings", "groups", "mine", "account"].includes(h)) setTab(h);
  }, []);

  // The password-reset link signs the visitor in; send them to the account tab to set a new one.
  useEffect(() => {
    if (account.recovery) setTab("account");
  }, [account.recovery]);

  // Picks saved to the account join the ones kept in this browser.
  useEffect(() => {
    const sb = supabase();
    if (!sb || !account.session) return setCloud({});
    sb.from("picks")
      .select("fixture_id, hg, ag")
      .then(({ data }) => setCloud(Object.fromEntries((data ?? []).map((r) => [r.fixture_id, [r.hg, r.ag] as [number, number]]))));
  }, [account.session]);

  const tabs: [Tab, string][] = account.enabled
    ? [
        ["standings", t.standings],
        ["groups", dict(lang).groups.title],
        ["mine", t.mine],
        ["account", account.session ? (account.username ?? t.account) : t.signIn],
      ]
    : [["mine", t.mine]];
  const current = account.enabled ? tab : "mine";
  const open = (id: Tab) => {
    setTab(id);
    history.replaceState(null, "", `${window.location.search}#${id}`);
  };

  return (
    <div className="stack">
      <div className="tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={current === id}
            onClick={() => open(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {current === "standings" && <Leaderboard lang={lang} me={account.username} onFirstPick={() => open("mine")} />}
      {current === "groups" && <Groups account={account} lang={lang} onSignIn={() => open("account")} />}
      {current === "mine" && <MyPicks lang={lang} cloud={cloud} />}
      {current === "account" && <AccountPanel account={account} lang={lang} />}
    </div>
  );
}
