/**
 * Posts the day's predictions (and on Mondays last week's record) to Telegram and Bluesky.
 * A channel is skipped when its secrets are not set, so this does nothing until they are added:
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID          (a bot that is an admin of the channel)
 *   BLUESKY_HANDLE, BLUESKY_APP_PASSWORD          (an app password, not the account password)
 *
 *   tsx scripts/social.ts            daily post
 *   tsx scripts/social.ts --dry      print instead of posting
 */
import { competitionName } from "../src/lib/leagues";
import { nation } from "../src/lib/nations";
import { team } from "../src/lib/teams";
import type { Fixture, Prediction } from "../src/lib/types";

const DATA = `${process.env.SUPABASE_URL ?? "https://cmwfmjbygorsjjopngky.supabase.co"}/storage/v1/object/public/site/data`;
const SITE = "rinvalo.net";
const DRY = process.argv.includes("--dry");

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

async function compose(): Promise<{ telegram: string; bluesky: string } | null> {
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
  // Bluesky allows 300 characters: the top games only.
  const short: string[] = [];
  for (const l of [...shortLines, ...games.map(line)]) {
    const text = ["Bugünün tahminleri", ...short, l, week, SITE].filter(Boolean).join("\n");
    if ([...text].length > 300) break;
    short.push(l);
  }
  const bluesky = [short.length ? "Bugünün tahminleri" : "", ...short, week, SITE].filter(Boolean).join("\n");
  return { telegram, bluesky };
}

async function telegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return console.log("Telegram: anahtar yok, atlandı.");
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, link_preview_options: { is_disabled: true } }),
  });
  if (!res.ok) throw new Error(`Telegram: ${res.status} ${await res.text()}`);
  console.log("Telegram: gönderildi.");
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
} else if (DRY) {
  console.log(`--- Telegram ---\n${post.telegram}\n\n--- Bluesky (${[...post.bluesky].length}) ---\n${post.bluesky}`);
} else {
  // One channel failing should not stop the other.
  const results = await Promise.allSettled([telegram(post.telegram), bluesky(post.bluesky)]);
  const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  for (const f of failed) console.error(String(f.reason));
  if (failed.length) process.exit(1);
}
