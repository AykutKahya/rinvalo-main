"use client";

import { useState } from "react";
import { dict, paths, type Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { Badges } from "./Badges";
import type { Account } from "./useAccount";

const NAME = /^[A-Za-z0-9_.çğıöşüÇĞİÖŞÜ-]{3,20}$/;

/** Sign up with a username, sign in, reset a forgotten password, sign out, delete the account. */
export function AccountPanel({ account, lang }: { account: Account; lang: Lang }) {
  const t = dict(lang).league2;
  const sb = supabase();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!sb) return <div className="card empty">{t.off}</div>;
  if (!account.ready) return <div className="card empty" style={{ minHeight: 160 }} />;

  async function run(job: () => Promise<string | null | void>) {
    setMsg(null);
    setBusy(true);
    try {
      const out = await job();
      if (out) setMsg(out);
    } catch {
      setMsg(t.error);
    } finally {
      setBusy(false);
    }
  }

  if (account.session) {
    // Arrived from the reset e-mail: choose a new password first.
    if (account.recovery)
      return (
        <section className="card card-pad account">
          <h2 style={{ fontSize: 18 }}>{t.newPassword}</h2>
          <form
            className="account-form"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const { error } = await sb.auth.updateUser({ password });
                if (error) return error.message;
                setPassword("");
                account.endRecovery();
                return t.passwordChanged;
              });
            }}
          >
            <label>
              {t.password}
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={8} />
            </label>
            <button className="btn accent" type="submit" disabled={busy}>
              {t.savePassword}
            </button>
          </form>
          {msg && (
            <p className="account-msg" role="status">
              {msg}
            </p>
          )}
        </section>
      );

    return (
      <section className="card card-pad account">
        <h2 style={{ fontSize: 18 }}>{t.welcome(account.username ?? account.session.user.email ?? "")}</h2>
        <p className="muted" style={{ margin: 0 }}>
          {t.signedInNote}
        </p>
        {msg && (
          <p className="account-msg" role="status">
            {msg}
          </p>
        )}
        <Badges lang={lang} />
        <div className="account-actions">
          <button className="btn ghost" type="button" onClick={() => sb.auth.signOut()}>
            {t.signOut}
          </button>
          {confirmDelete ? (
            <span className="account-danger">
              <span>{t.deleteConfirm}</span>
              <button
                className="btn danger"
                type="button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const { error } = await sb.rpc("delete_my_account");
                    if (error) return t.error;
                    await sb.auth.signOut();
                  })
                }
              >
                {t.deleteYes}
              </button>
              <button className="btn ghost" type="button" onClick={() => setConfirmDelete(false)}>
                {t.cancel}
              </button>
            </span>
          ) : (
            <button className="link-btn" type="button" onClick={() => setConfirmDelete(true)}>
              {t.deleteAccount}
            </button>
          )}
        </div>
      </section>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      if (mode === "forgot") {
        const { error } = await sb!.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}${paths(lang).myPicks}` });
        return error ? error.message : t.resetSent;
      }
      if (mode === "up") {
        if (!NAME.test(username)) return t.usernameRule;
        const { data: free } = await sb!.rpc("username_free", { name: username });
        if (free === false) return t.usernameTaken;
        const { data, error } = await sb!.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: window.location.href } });
        if (error) return error.message;
        if (!data.session) return t.checkMail;
      } else {
        const { error } = await sb!.auth.signInWithPassword({ email, password });
        if (error) return error.message;
      }
      account.refresh();
    });
  }

  return (
    <section className="card card-pad account">
      {mode === "forgot" ? (
        <h2 style={{ fontSize: 18 }}>{t.forgotTitle}</h2>
      ) : (
        <div className="seg" role="tablist" style={{ alignSelf: "flex-start" }}>
          <button role="tab" aria-selected={mode === "up"} onClick={() => setMode("up")}>
            {t.signUp}
          </button>
          <button role="tab" aria-selected={mode === "in"} onClick={() => setMode("in")}>
            {t.signIn}
          </button>
        </div>
      )}
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
        {mode !== "forgot" && (
          <label>
            {t.password}
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "up" ? "new-password" : "current-password"} required minLength={8} />
          </label>
        )}
        <button className="btn accent" type="submit" disabled={busy}>
          {mode === "forgot" ? t.sendReset : mode === "up" ? t.signUp : t.signIn}
        </button>
        {msg && (
          <p className="account-msg" role="status">
            {msg}
          </p>
        )}
      </form>
      <div className="account-links">
        {mode === "in" && (
          <button className="link-btn" type="button" onClick={() => setMode("forgot")}>
            {t.forgot}
          </button>
        )}
        {mode === "forgot" && (
          <button className="link-btn" type="button" onClick={() => setMode("in")}>
            {t.backToSignIn}
          </button>
        )}
        <a href={paths(lang).privacy}>{dict(lang).privacy.title}</a>
      </div>
    </section>
  );
}
