/**
 * Posts the day's predictions (and on Mondays last week's record) with the day's image
 * (rinvalo.net/og/day/tr/<date>) to every channel whose secrets are set; the others are skipped:
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID                     a bot that is an admin of the channel
 *   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET  an X app with read and write access
 *   INSTAGRAM_USER_ID, INSTAGRAM_TOKEN                       a professional account and a page token
 *   BLUESKY_HANDLE, BLUESKY_APP_PASSWORD                     an app password, not the account password
 * Instagram reads the image from a public address, so it is stored as social/day-DD.jpg first
 * (RINVALO_UPLOAD_TOKEN).
 *
 *   tsx scripts/social.ts                daily post
 *   tsx scripts/social.ts --dry          print instead of posting (saves the image to /tmp)
 *   tsx scripts/social.ts --only=x,ig    only these channels (telegram, x, ig, bluesky)
 */
import { createHmac, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { competitionName } from "../src/lib/leagues";
import { nation } from "../src/lib/nations";
import { team } from "../src/lib/teams";
import type { Fixture, Prediction } from "../src/lib/types";

const SUPABASE = process.env.SUPABASE_URL ?? "https://cmwfmjbygorsjjopngky.supabase.co";
const DATA = `${SUPABASE}/storage/v1/object/public/site/data`;
const SITE = "rinvalo.net";
const DRY = process.argv.includes("--dry");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const on = (channel: string) => !ONLY || ONLY.includes(channel);

async function json<T>(name: string): Promise<T> {
  const res = await fetch(`${DATA}/${name}`, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${name}: ${res.status}`);
  return (await res.json()) as T;
}

const istanbulDay = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" });
const pick = (p: number[]) => p.indexOf(Math.max(...p));
const outcome = (h: number, a: number) => (h > a ? 0 : h === a ? 1 : 2);
const pct = (x: number) => `%${Math.round(x * 100)}`;

type Post = { telegram: string; bluesky: string; x: string; instagram: string };

/** X counts a link as 23 and wide characters (emoji, CJK) as 2. */
const xLength = (text: string) => [...text.replace(SITE, "x".repeat(23))].reduce((n, c) => n + (c.codePointAt(0)! > 0x10ff ? 2 : 1), 0);

/** The heading, as many lines as fit the limit, then the week line and the address. */
function fit(lines: string[], week: string, fits: (text: string) => boolean): string {
  const out: string[] = [];
  const text = (list: string[]) => [list.length ? "Bugünün tahminleri" : "", ...list, week, SITE].filter(Boolean).join("\n");
  for (const l of lines) {
    if (!fits(text([...out, l]))) break;
    out.push(l);
  }
  return text(out);
}

async function compose(): Promise<Post | null> {
  const [season, cups, store, intl] = await Promise.all([
    json<{ fixtures: Fixture[] }>("season.json"),
    json<{ fixtures: Fixture[] }>("cups.json"),
    json<{ predictions: Record<string, Prediction> }>("predictions.json"),
    json<{ games: { kickoff: string; home: string; away: string; hg: number | null; pred: { p: number[]; score: number[] } | null }[] }>("international.json").catch(() => ({ games: [] })),
  ]);
  const preds = store.predictions;
  const all = [...season.fixtures, ...cups.fixtures];
  const today = istanbulDay(new Date());

  // Süper Lig first, then the cups, then the rest; closest calls are the least interesting, so the
  // most confident pick of each game is shown with its share.
  const rank = (f: Fixture) => (f.league === "super-lig" ? 0 : ["ucl", "uel", "uecl"].includes(f.league) ? 1 : 2);
  const games = all
    .filter((f) => f.status === "scheduled" && istanbulDay(f.kickoff) === today && preds[f.id])
    .sort((a, b) => rank(a) - rank(b) || a.kickoff.localeCompare(b.kickoff));

  const line = (f: Fixture) => {
    const p = preds[f.id];
    const k = pick(p.p);
    const who = k === 1 ? "X" : team(k === 0 ? f.home : f.away).short;
    return `${time(f.kickoff)} ${team(f.home).name} – ${team(f.away).name}: ${p.score[0]}-${p.score[1]} (${who} ${pct(p.p[k])})`;
  };

  const parts: string[] = [];
  const shortLines: string[] = [];
  const national = intl.games.filter((g) => g.hg === null && g.pred && istanbulDay(g.kickoff) === today);
  if (national.length) {
    const nline = (g: (typeof national)[number]) => {
      const k = pick(g.pred!.p);
      const who = k === 1 ? "X" : nation(k === 0 ? g.home : g.away, "tr");
      return `${time(g.kickoff)} ${nation(g.home, "tr")} – ${nation(g.away, "tr")}: ${g.pred!.score[0]}-${g.pred!.score[1]} (${who} ${pct(g.pred!.p[k])})`;
    };
    // Türkiye's game first.
    national.sort((a, b) => Number(b.home === "Turkey" || b.away === "Turkey") - Number(a.home === "Turkey" || a.away === "Turkey"));
    parts.push(`Uluslar Ligi\n${national.slice(0, 10).map(nline).join("\n")}`);
    shortLines.push(...national.map(nline));
  }
  if (games.length) {
    const byComp = new Map<string, Fixture[]>();
    for (const f of games.slice(0, 12)) byComp.set(f.league, [...(byComp.get(f.league) ?? []), f]);
    parts.push(
      [...byComp].map(([c, list]) => `${competitionName(c, "tr")}\n${list.map(line).join("\n")}`).join("\n\n") +
        (games.length > 12 ? `\n\n+${games.length - 12} maç daha` : ""),
    );
  }

  // Monday: the past seven days in the leagues and cups.
  let week = "";
  if (new Date().toLocaleDateString("en-US", { timeZone: "Europe/Istanbul", weekday: "short" }) === "Mon") {
    const from = Date.now() - 7 * 86400_000;
    const graded = all.filter((f) => {
      const p = preds[f.id];
      return f.status === "finished" && f.hg !== null && f.ag !== null && Date.parse(f.kickoff) >= from && p && (!p.madeAt || Date.parse(p.madeAt) < Date.parse(f.kickoff));
    });
    if (graded.length >= 10) {
      const hits = graded.filter((f) => pick(preds[f.id].p) === outcome(f.hg!, f.ag!)).length;
      const exact = graded.filter((f) => preds[f.id].score[0] === f.hg && preds[f.id].score[1] === f.ag).length;
      week = `Geçen hafta: ${graded.length} maçta ${hits} doğru sonuç (${pct(hits / graded.length)}), ${exact} tam skor.`;
      parts.push(week);
    }
  }
  if (!parts.length) return null;

  const head = games.length || national.length ? "Bugünün tahminleri\n\n" : "";
  const telegram = `${head}${parts.join("\n\n")}\n\n${SITE}`;
  // Bluesky and X are short: the top games only, the image shows the rest.
  const top = [...shortLines, ...games.map(line)];
  const bluesky = fit(top, week, (t) => [...t].length <= 300);
  const x = fit(top, week, (t) => xLength(t) <= 280);
  // Instagram captions have no links, so the address is said plainly.
  const instagram = `${telegram}\n\n#futbol #süperlig #maçtahmini`;
  return { telegram, bluesky, x, instagram };
}

/** The day's image as JPEG, or null when the site has none for today. */
async function image(): Promise<Buffer | null> {
  const url = `${process.env.SOCIAL_ORIGIN ?? `https://${SITE}`}/og/day/tr/${istanbulDay(new Date())}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Görsel: ${res.status}`);
  return sharp(Buffer.from(await res.arrayBuffer())).flatten({ background: "#0b1220" }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}

/** Stores the image where Instagram can read it and returns its public address. */
async function publish(jpg: Buffer): Promise<string> {
  const token = process.env.RINVALO_UPLOAD_TOKEN;
  if (!token) throw new Error("Instagram: RINVALO_UPLOAD_TOKEN yok, görsel yüklenemedi.");
  const path = `social/day-${istanbulDay(new Date()).slice(8)}.jpg`;
  const res = await fetch(`${SUPABASE}/functions/v1/upload?path=${encodeURIComponent(path)}`, {
    method: "POST",
    headers: { "x-upload-token": token, "content-type": "image/jpeg" },
    body: new Uint8Array(jpg),
  });
  if (!res.ok) throw new Error(`Görsel yükleme: ${res.status} ${await res.text()}`);
  return `${SUPABASE}/storage/v1/object/public/site/${path}?v=${Date.now()}`;
}

async function telegram(text: string, jpg: Buffer | null) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return console.log("Telegram: anahtar yok, atlandı.");
  const api = `https://api.telegram.org/bot${token}`;
  // A photo caption holds 1024 characters; a longer text follows the photo as its own message.
  const caption = jpg && [...text].length <= 1024;
  if (jpg) {
    const form = new FormData();
    form.set("chat_id", chat);
    form.set("photo", new Blob([new Uint8Array(jpg)], { type: "image/jpeg" }), "tahminler.jpg");
    if (caption) form.set("caption", text);
    const res = await fetch(`${api}/sendPhoto`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`Telegram foto: ${res.status} ${await res.text()}`);
  }
  if (!caption) {
    const res = await fetch(`${api}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, link_preview_options: { is_disabled: true } }),
    });
    if (!res.ok) throw new Error(`Telegram: ${res.status} ${await res.text()}`);
  }
  console.log("Telegram: gönderildi.");
}

/** OAuth 1.0a header for an X request; body fields are not signed (JSON and multipart bodies). */
function oauth(method: string, url: string): string {
  const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  const params: Record<string, string> = {
    oauth_consumer_key: process.env.X_API_KEY!,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: process.env.X_ACCESS_TOKEN!,
    oauth_version: "1.0",
  };
  const u = new URL(url);
  const all = { ...params, ...Object.fromEntries(u.searchParams) };
  const base = Object.keys(all).sort().map((k) => `${enc(k)}=${enc(all[k])}`).join("&");
  const text = [method, enc(`${u.origin}${u.pathname}`), enc(base)].join("&");
  const key = `${enc(process.env.X_API_SECRET!)}&${enc(process.env.X_ACCESS_SECRET!)}`;
  params.oauth_signature = createHmac("sha1", key).update(text).digest("base64");
  return "OAuth " + Object.keys(params).sort().map((k) => `${enc(k)}="${enc(params[k])}"`).join(", ");
}

async function xMedia(jpg: Buffer): Promise<string | null> {
  for (const [url, field] of [
    ["https://api.x.com/2/media/upload", "media"],
    ["https://upload.twitter.com/1.1/media/upload.json", "media"],
  ] as const) {
    const form = new FormData();
    form.set(field, new Blob([new Uint8Array(jpg)], { type: "image/jpeg" }), "tahminler.jpg");
    if (url.includes("/2/")) {
      form.set("media_category", "tweet_image");
      form.set("media_type", "image/jpeg");
    }
    const res = await fetch(url, { method: "POST", headers: { authorization: oauth("POST", url) }, body: form });
    if (res.ok) {
      const body = (await res.json()) as { data?: { id: string }; media_id_string?: string };
      const id = body.data?.id ?? body.media_id_string;
      if (id) return id;
    }
    console.log(`X görsel (${new URL(url).host}): ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  return null;
}

async function x(text: string, jpg: Buffer | null) {
  if (!process.env.X_API_KEY || !process.env.X_API_SECRET || !process.env.X_ACCESS_TOKEN || !process.env.X_ACCESS_SECRET) return console.log("X: anahtar yok, atlandı.");
  // A failed image upload still posts the text.
  const media = jpg ? await xMedia(jpg) : null;
  const url = "https://api.x.com/2/tweets";
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: oauth("POST", url), "content-type": "application/json" },
    body: JSON.stringify(media ? { text, media: { media_ids: [media] } } : { text }),
  });
  if (!res.ok) throw new Error(`X: ${res.status} ${await res.text()}`);
  console.log(`X: gönderildi${media ? "" : " (görselsiz)"}.`);
}

async function instagram(caption: string, jpg: Buffer | null) {
  const user = process.env.INSTAGRAM_USER_ID;
  const token = process.env.INSTAGRAM_TOKEN;
  if (!user || !token) return console.log("Instagram: anahtar yok, atlandı.");
  if (!jpg) return console.log("Instagram: bugünün görseli yok, atlandı.");
  const api = "https://graph.facebook.com/v21.0";
  const call = async (path: string, params: Record<string, string>, method = "POST") => {
    const q = new URLSearchParams({ ...params, access_token: token });
    const res = await fetch(method === "GET" ? `${api}/${path}?${q}` : `${api}/${path}`, method === "GET" ? {} : { method, body: q });
    const body = (await res.json()) as { id?: string; status_code?: string; error?: { message: string } };
    if (!res.ok) throw new Error(`Instagram: ${res.status} ${body.error?.message ?? ""}`);
    return body;
  };
  const { id } = await call(`${user}/media`, { image_url: await publish(jpg), caption });
  // The container is processed in the background; publishing before it is ready fails.
  for (let i = 0; i < 20; i++) {
    const { status_code } = await call(id!, { fields: "status_code" }, "GET");
    if (status_code === "FINISHED") break;
    if (status_code === "ERROR" || status_code === "EXPIRED") throw new Error(`Instagram: görsel işlenemedi (${status_code})`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  await call(`${user}/media_publish`, { creation_id: id! });
  console.log("Instagram: gönderildi.");
}

async function bluesky(text: string) {
  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!handle || !password) return console.log("Bluesky: anahtar yok, atlandı.");
  const api = "https://bsky.social/xrpc";
  const s = await fetch(`${api}/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: handle, password }),
  });
  if (!s.ok) throw new Error(`Bluesky giriş: ${s.status}`);
  const { accessJwt, did } = (await s.json()) as { accessJwt: string; did: string };
  // The site address becomes a link; facets count bytes, not characters.
  const bytes = new TextEncoder();
  const at = text.lastIndexOf(SITE);
  const start = bytes.encode(text.slice(0, at)).length;
  const record = {
    $type: "app.bsky.feed.post",
    text,
    createdAt: new Date().toISOString(),
    langs: ["tr"],
    facets: [{ index: { byteStart: start, byteEnd: start + bytes.encode(SITE).length }, features: [{ $type: "app.bsky.richtext.facet#link", uri: `https://${SITE}` }] }],
  };
  const res = await fetch(`${api}/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${accessJwt}` },
    body: JSON.stringify({ repo: did, collection: "app.bsky.feed.post", record }),
  });
  if (!res.ok) throw new Error(`Bluesky: ${res.status} ${await res.text()}`);
  console.log("Bluesky: gönderildi.");
}

const post = await compose();
if (!post) {
  console.log("Bugün paylaşılacak maç yok.");
} else {
  const jpg = await image().catch((e) => {
    console.error(String(e));
    return null;
  });
  if (DRY) {
    if (jpg) writeFileSync("/tmp/rinvalo-day.jpg", jpg);
    console.log(`Görsel: ${jpg ? `${Math.round(jpg.length / 1024)} KB, /tmp/rinvalo-day.jpg` : "yok"}`);
    console.log(`--- Telegram ---\n${post.telegram}\n\n--- X (${xLength(post.x)}) ---\n${post.x}\n\n--- Bluesky (${[...post.bluesky].length}) ---\n${post.bluesky}\n\n--- Instagram ---\n${post.instagram}`);
    process.exit(0);
  }
  // One channel failing should not stop the others.
  const results = await Promise.allSettled([
    on("telegram") ? telegram(post.telegram, jpg) : null,
    on("x") ? x(post.x, jpg) : null,
    on("ig") ? instagram(post.instagram, jpg) : null,
    on("bluesky") ? bluesky(post.bluesky) : null,
  ]);
  const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  for (const f of failed) console.error(String(f.reason));
  if (failed.length) process.exit(1);
}
