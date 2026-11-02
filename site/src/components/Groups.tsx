"use client";

import { useCallback, useEffect, useState } from "react";
import { dict, paths, type Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { BoardTable, PeriodPicker, since, type Period, type Row } from "./Leaderboard";
import type { Account } from "./useAccount";

type Group = { code: string; name: string; members: number; owner: boolean };

/** Friend leagues: open one, share its code, follow a table of your own. */
export function Groups({ account, lang, onSignIn }: { account: Account; lang: Lang; onSignIn: () => void }) {
  const t = dict(lang).groups;
  const sb = supabase();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("season");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(
    (select?: string) => {
      if (!sb) return;
      sb.rpc("my_groups").then(({ data }) => {
        const list = (data as Group[]) ?? [];
        setGroups(list);
        setActive((cur) => select ?? (list.some((g) => g.code === cur) ? cur : (list[0]?.code ?? null)));
      });
    },
    [sb],
  );

  useEffect(() => {
    if (account.session) load();
  }, [account.session, load]);

  // A shared link (?katil=CODE) fills the join box.
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("katil");
    if (c) setCode(c.toUpperCase());
  }, []);

  useEffect(() => {
    if (!sb || !active) return setRows(null);
    setRows(null);
    sb.rpc("group_board", { group_code: active, since: since(period) }).then(({ data }) => setRows((data as Row[]) ?? []));
  }, [sb, active, period]);

  if (!sb) return <div className="card empty">{t.off}</div>;
  if (!account.ready) return <div className="card empty" style={{ minHeight: 160 }} />;
  if (!account.session)
    return (
      <section className="card card-pad account">
        <p style={{ margin: 0 }}>{t.signInFirst}</p>
        <button className="btn accent" type="button" onClick={onSignIn} style={{ alignSelf: "flex-start" }}>
          {dict(lang).league2.signIn}
        </button>
      </section>
    );

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const { data, error } = await sb!.rpc("create_group", { name });
    if (error) return setMsg(error.message.includes("too many") ? t.tooMany : t.error);
    setName("");
    load(data as string);
  }

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const { data, error } = await sb!.rpc("join_group", { group_code: code });
    if (error) return setMsg(error.message.includes("no such") ? t.noSuch : error.message.includes("full") ? t.full : t.error);
    setCode("");
    history.replaceState(null, "", window.location.pathname + window.location.hash);
    load(data as string);
  }

  async function leave(c: string) {
    await sb!.rpc("leave_group", { group_code: c });
    load();
  }

  const current = groups?.find((g) => g.code === active);
  const link = current ? `${window.location.origin}${paths(lang).myPicks}?katil=${current.code}#groups` : "";

  return (
    <div className="stack">
      {groups && groups.length > 0 && current && (
        <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="section-title" style={{ margin: 0 }}>
            {groups.length > 1 ? (
              <select className="group-pick" value={current.code} onChange={(e) => setActive(e.target.value)} aria-label={t.title}>
                {groups.map((g) => (
                  <option key={g.code} value={g.code}>
                    {g.name}
                  </option>
                ))}
              </select>
            ) : (
              <h2 style={{ fontSize: 16 }}>{current.name}</h2>
            )}
            <PeriodPicker period={period} onChange={setPeriod} lang={lang} />
          </div>
          <BoardTable rows={rows} me={account.username} lang={lang} />
          <div className="group-share">
            <span className="muted">
              {t.code} <b className="group-code">{current.code}</b> · {t.members(current.members)}
            </span>
            <button
              className="btn ghost"
              type="button"
              onClick={async () => {
                const text = t.invite(current.name, current.code);
                if (navigator.share) await navigator.share({ title: current.name, text, url: link }).catch(() => {});
                else {
                  await navigator.clipboard?.writeText(`${text} ${link}`).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }
              }}
            >
              {copied ? t.copied : t.share}
            </button>
            <button className="btn ghost" type="button" onClick={() => leave(current.code)}>
              {t.leave}
            </button>
          </div>
        </section>
      )}

      <section className="card card-pad group-forms">
        <form onSubmit={join} className="account-form">
          <label>
            {t.joinLabel}
            <input
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 6),
                )
              }
              placeholder="H3SR95"
              required
              minLength={6}
              maxLength={6}
              autoCapitalize="characters"
            />
          </label>
          <button className="btn accent" type="submit">
            {t.join}
          </button>
        </form>
        <form onSubmit={create} className="account-form">
          <label>
            {t.createLabel}
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} required minLength={3} maxLength={30} />
          </label>
          <button className="btn ghost" type="submit">
            {t.create}
          </button>
        </form>
        {msg && (
          <p className="account-msg" role="status">
            {msg}
          </p>
        )}
      </section>
      {groups && groups.length === 0 && (
        <p className="muted" style={{ margin: 0 }}>
          {t.none}
        </p>
      )}
    </div>
  );
}
