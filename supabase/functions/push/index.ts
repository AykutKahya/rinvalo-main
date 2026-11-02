// Sends the notifications that are due: kick-off in 15 minutes, or a result just settled, to every
// browser that follows the game or one of its clubs. pg_cron calls this every five minutes. Calling
// it more often sends nothing extra: push_due() hands each notification out only once.
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type Due = { endpoint: string; p256dh: string; auth: string; lang: "tr" | "en"; fixture_id: string; event: "start" | "end"; home: string; away: string; hg: number | null; ag: number | null };

const SITE = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/site/data`;

const TEXT = {
  tr: {
    start: (h: string, a: string) => ({ title: `${h} – ${a}`, body: "15 dakika sonra başlıyor. Rinvalo tahminine bak." }),
    end: (h: string, a: string, hg: number, ag: number) => ({ title: "Maç sonucu", body: `${h} ${hg}-${ag} ${a}` }),
    path: (id: string) => `/mac/${id}`,
  },
  en: {
    start: (h: string, a: string) => ({ title: `${h} – ${a}`, body: "Kicks off in 15 minutes. See Rinvalo's pick." }),
    end: (h: string, a: string, hg: number, ag: number) => ({ title: "Full time", body: `${h} ${hg}-${ag} ${a}` }),
    path: (id: string) => `/en/match/${id}`,
  },
};

async function names(): Promise<Record<string, string>> {
  const [club, cup] = await Promise.all(
    ["team-names.json", "cup-teams.json"].map((f) =>
      fetch(`${SITE}/${f}`)
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
    ),
  );
  const out: Record<string, string> = { ...(club as Record<string, string>) };
  for (const [slug, v] of Object.entries(cup as Record<string, [string]>)) out[slug] ??= v[0];
  return out;
}

Deno.serve(async () => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: due, error } = await sb.rpc("push_due");
  if (error) return new Response(error.message, { status: 500 });
  const list = (due ?? []) as Due[];
  if (list.length === 0) return Response.json({ sent: 0 });

  const { data: cfg } = await sb.rpc("push_config");
  webpush.setVapidDetails(cfg.vapid_subject, cfg.vapid_public, cfg.vapid_private);
  const name = await names();
  const nm = (slug: string) => name[slug] ?? slug;

  let sent = 0;
  await Promise.all(
    list.map(async (d) => {
      const t = TEXT[d.lang] ?? TEXT.tr;
      const msg = d.event === "start" ? t.start(nm(d.home), nm(d.away)) : t.end(nm(d.home), nm(d.away), d.hg ?? 0, d.ag ?? 0);
      const payload = JSON.stringify({ ...msg, url: t.path(d.fixture_id), tag: `${d.fixture_id}-${d.event}` });
      try {
        await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, payload, { TTL: 3600 });
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        // The browser dropped the subscription.
        if (code === 404 || code === 410) await sb.rpc("push_forget", { endpoint: d.endpoint });
      }
    }),
  );
  return Response.json({ sent, due: list.length });
});
