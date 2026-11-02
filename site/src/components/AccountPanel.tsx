"use client";

import { useState } from "react";
import { dict, type Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { Badges } from "./Badges";
import type { Account } from "./useAccount";

const NAME = /^[A-Za-z0-9_.çğıöşüÇĞİÖŞÜ-]{3,20}$/;

/** Sign up with a username, sign in, sign out. */
export function AccountPanel({ account, lang }: { account: Account; lang: Lang }) {
  const t = dict(lang).league2;
  const sb = supabase();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!sb) return <div className="card empty">{t.off}</div>;
  if (!account.ready) return <div className="card empty" style={{ minHeight: 160 }} />;

  if (account.session) {
    return (
      <section className="card card-pad account">
        <h2 style={{ fontSize: 18 }}>{t.welcome(account.username ?? account.session.user.email ?? "")}</h2>
        <p className="muted" style={{ margin: 0 }}>
          {t.signedInNote}
        </p>
        <Badges lang={lang} />
        <button className="btn ghost" type="button" onClick={() => sb.auth.signOut()} style={{ alignSelf: "flex-start" }}>
          {t.signOut}
        </button>
      </section>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sb) return;
    setMsg(null);
    setBusy(true);
    try {
      if (mode === "up") {
        if (!NAME.test(username)) return setMsg(t.usernameRule);
        const { data: free } = await sb.rpc("username_free", { name: username });
        if (free === false) return setMsg(t.usernameTaken);
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: window.location.href } });
        if (error) return setMsg(error.message);
        if (!data.session) return setMsg(t.checkMail);
        account.refresh();
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) return setMsg(error.message);
        account.refresh();
      }
    } catch {
      setMsg(t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card card-pad account">
      <div className="seg" role="tablist" style={{ alignSelf: "flex-start" }}>
        <button role="tab" aria-selected={mode === "up"} onClick={() => setMode("up")}>
          {t.signUp}
        </button>
        <button role="tab" aria-selected={mode === "in"} onClick={() => setMode("in")}>
          {t.signIn}
        </button>
      </div>
      <form onSubmit={submit} className="account-form">
        {mode === "up" && (
          <label>
            {t.username}
            <input value={username} onChange={(e) => setUsername(e.target.value.trim())} autoComplete="nickname" required minLength={3} maxLength={20} />
            <small>{t.usernameRule}</small>
          </label>
        )}
        <label>
          {t.email}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value.trim())} autoComplete="email" required />
        </label>
        <label>
          {t.password}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "up" ? "new-password" : "current-password"} required minLength={8} />
        </label>
        <button className="btn accent" type="submit" disabled={busy}>
          {mode === "up" ? t.signUp : t.signIn}
        </button>
        {msg && (
          <p className="account-msg" role="status">
            {msg}
          </p>
        )}
      </form>
    </section>
  );
}
