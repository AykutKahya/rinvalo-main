// The bot's door into Supabase. POST writes its output (data/*.json, assets.tar.gz) to the public
// "site" bucket; GET returns the prediction league for the weekly backup.
// The bot sends the upload token; only its SHA-256 lives here, so this file can be public.
import { createClient } from "jsr:@supabase/supabase-js@2";

const TOKEN_SHA256 = "a59201dab66e59181e5bdb4fc3f21c3969b63f00702a50a6f604763903747cce";
const PATH = /^(data\/[a-z0-9-]+\.json|assets\.tar\.gz)$/;

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const token = req.headers.get("x-upload-token") ?? "";
  if ((await sha256(token)) !== TOKEN_SHA256) return new Response("token", { status: 401 });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (req.method === "GET") {
    const { data, error } = await sb.rpc("export_league");
    if (error) return new Response(error.message, { status: 500 });
    return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
  }
  if (req.method !== "POST") return new Response("method", { status: 405 });

  const path = new URL(req.url).searchParams.get("path") ?? "";
  if (!PATH.test(path)) return new Response("path", { status: 400 });

  const body = new Uint8Array(await req.arrayBuffer());
  const type = path.endsWith(".json") ? "application/json" : "application/gzip";
  const { error } = await sb.storage.from("site").upload(path, body, { upsert: true, contentType: type, cacheControl: "60" });
  if (error) return new Response(error.message, { status: 500 });
  return new Response(JSON.stringify({ path, bytes: body.length }), { headers: { "content-type": "application/json" } });
});
