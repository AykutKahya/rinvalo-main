"use client";

import { useEffect, useState } from "react";
import { dict, type Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

/** Public half of the VAPID pair; the private half stays in the database. */
const VAPID = "BMry-vxF0ZrOu0mbenDO3FrkkVYS6nz-K5ec2R_cjFKz4dG6zIL-n84KxhcptwurZB4LrOufUlgM8hOocwHPGmM";

type State = "off" | "on" | "busy" | "blocked" | "ios" | "none";

function key(b64: string) {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

/** Kick-off and full-time notifications for a game or a club. No account needed. */
export function NotifyButton({ kind, id, lang, look = "pill" }: { kind: "match" | "team"; id: string; lang: Lang; look?: "pill" | "button" }) {
  const t = dict(lang).notify;
  const [state, setState] = useState<State>("none");
  const [tip, setTip] = useState(false);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) {
      // iPhone and iPad allow web push only once the site is added to the home screen.
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) setState("ios");
      return;
    }
    if (Notification.permission === "denied") return setState("blocked");
    setState("off");
    if (Notification.permission !== "granted") return;
    navigator.serviceWorker.ready
      .then((r) => r.pushManager.getSubscription())
      .then(async (sub) => {
        if (!sub) return;
        const { data } = await supabase()!.rpc("push_following", { endpoint: sub.endpoint });
        if ((data as { follow_kind: string; follow_ref: string }[] | null)?.some((f) => f.follow_kind === kind && f.follow_ref === id)) setState("on");
      })
      .catch(() => {});
  }, [kind, id]);

  async function toggle() {
    if (state === "ios" || state === "blocked") return setTip((v) => !v);
    const sb = supabase();
    if (!sb) return;
    const follow = state !== "on";
    setState("busy");
    try {
      if (follow && (await Notification.requestPermission()) !== "granted") return setState("blocked");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(VAPID) }));
      const json = sub.toJSON();
      const { error } = await sb.rpc("push_follow", { endpoint: sub.endpoint, p256dh: json.keys!.p256dh, auth: json.keys!.auth, lang, kind, ref: id, follow });
      setState(error ? (follow ? "off" : "on") : follow ? "on" : "off");
    } catch {
      setState(follow ? "off" : "on");
    }
  }

  if (state === "none") return null;
  const on = state === "on";
  return (
    <span className="notify">
      <button type="button" className={`${look === "pill" ? "share-btn" : "btn ghost notify-btn"}${on ? " on" : ""}`} onClick={toggle} disabled={state === "busy"} aria-pressed={on} title={kind === "match" ? t.matchHint : t.teamHint}>
        <svg viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {on ? t.on : t.off}
      </button>
      {tip && (
        <span className="notify-tip" role="status">
          {state === "ios" ? t.ios : t.blocked}
        </span>
      )}
    </span>
  );
}
