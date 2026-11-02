"use client";

import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface Account {
  /** False when the deployment has no Supabase settings. */
  enabled: boolean;
  ready: boolean;
  session: Session | null;
  username: string | null;
  /** Signed in from a password-reset link: a new password is due. */
  recovery: boolean;
  endRecovery: () => void;
  refresh: () => void;
}

/** The signed-in visitor and their league name. */
export function useAccount(): Account {
  const sb = supabase();
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(!sb);
  const [tick, setTick] = useState(0);
  const [recovery, setRecovery] = useState(false);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, [sb]);

  useEffect(() => {
    if (!sb || !session) {
      setUsername(null);
      return;
    }
    sb.from("profiles")
      .select("username")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setUsername(data?.username ?? null));
  }, [sb, session, tick]);

  const endRecovery = useCallback(() => setRecovery(false), []);
  return { enabled: !!sb, ready, session, username, recovery, endRecovery, refresh };
}
