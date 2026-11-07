import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { WHITE_LOGO } from "@/components/Crest";
import { getInternational, getMatches } from "@/lib/data";
import { fmt } from "@/lib/format";
import { dict, type Lang } from "@/lib/i18n";
import { cupByCode, isCup, leagueByCode, nameLang } from "@/lib/leagues";
import { pickOf } from "@/lib/model";
import { nation, nationSlug } from "@/lib/nations";
import { team } from "@/lib/teams";

// One day's picks as a portrait image for the daily social posts (Instagram, X, Telegram).
export const dynamic = "force-dynamic";

const ROOT = process.cwd();
const font = (f: string) => readFileSync(join(ROOT, "assets", "fonts", f));
const FONTS = [
  { name: "Barlow Condensed", data: font("BarlowCondensed-SemiBold.ttf"), weight: 600 as const },
  { name: "Barlow Condensed", data: font("BarlowCondensed-ExtraBold.ttf"), weight: 800 as const },
  { name: "Barlow", data: font("Barlow-Medium.ttf"), weight: 500 as const },
];
const png = (dir: string, slug: string) => {
  const p = join(ROOT, "public", dir, `${slug}.png`);
  return existsSync(p) ? `data:image/png;base64,${readFileSync(p).toString("base64")}` : null;
};

// Night palette from globals.css.
const C = { bg: "#0b1018", card: "#131a24", line: "#243042", ink: "#eef2f7", muted: "#8794a7", accent: "#ffb21e" };
const ROWS = 8;

type Row = { key: string; kickoff: string; comp: string | null; home: Side; away: Side; score: [number, number]; p: number[] };
type Side = { name: string; crest: string | null; lang: string };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });

/** The day's games in the order the posts use: Türkiye's national game, Süper Lig, the cups, the rest. */
function dayRows(date: string, lang: Lang): Row[] {
  const national = getInternational()
    .games.filter((g) => g.hg === null && g.pred && day(g.kickoff) === date)
    .map((g): Row & { rank: number } => ({
      key: g.id,
      kickoff: g.kickoff,
      comp: null,
      home: { name: nation(g.home, lang), crest: png("nations", nationSlug(g.home)), lang },
      away: { name: nation(g.away, lang), crest: png("nations", nationSlug(g.away)), lang },
      score: g.pred!.score,
      p: g.pred!.p,
      rank: g.home === "Turkey" || g.away === "Turkey" ? -1 : 3,
    }));
  const clubs = getMatches()
    .filter((m) => m.status === "scheduled" && m.prediction && day(m.kickoff) === date)
    .map((m): Row & { rank: number } => ({
      key: m.id,
      kickoff: m.kickoff,
      comp: m.league,
      home: { name: team(m.home, lang).name, crest: png("crests", m.home), lang: nameLang(m.league) },
      away: { name: team(m.away, lang).name, crest: png("crests", m.away), lang: nameLang(m.league) },
      score: m.prediction!.score,
      p: m.prediction!.p,
      rank: m.league === "super-lig" ? 0 : isCup(m.league) ? 1 : 2,
    }));
  return [...national, ...clubs].sort((a, b) => a.rank - b.rank || a.kickoff.localeCompare(b.kickoff));
}

export async function GET(req: Request, { params }: { params: Promise<{ lang: string; date: string }> }) {
  const { lang: raw, date } = await params;
  const lang: Lang = raw === "en" ? "en" : "tr";
  const rows = /^\d{4}-\d{2}-\d{2}$/.test(date) ? dayRows(date, lang) : [];
  if (rows.length === 0) return new Response("Not found", { status: 404 });

  const t = dict(lang);
  const f = fmt(lang);
  const up = (s: string, l: string = lang) => s.toLocaleUpperCase(l === "tr" ? "tr-TR" : "en-GB").replace("RİNVALO", "RINVALO");
  const shown = rows.slice(0, ROWS);
  const title = lang === "tr" ? "Bugünün tahminleri" : "Today's predictions";

  const side = (s: Side, align: "left" | "right", bold: boolean) => {
    const img = s.crest ? <img src={s.crest} width={44} height={44} style={{ objectFit: "contain" }} /> : <div style={{ width: 44, height: 44, borderRadius: 22, background: C.line }} />;
    const name = (
      <span style={{ fontFamily: "Barlow Condensed", fontWeight: bold ? 800 : 600, fontSize: s.name.length > 17 ? 25 : s.name.length > 13 ? 29 : 33, color: bold ? C.ink : C.muted, lineHeight: 1, textAlign: align }}>
        {up(s.name, s.lang)}
      </span>
    );
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, width: 318, justifyContent: align === "left" ? "flex-start" : "flex-end" }}>
        {align === "left" ? img : name}
        {align === "left" ? name : img}
      </div>
    );
  };
  const mark = (code: string | null) => {
    const accent = code ? (leagueByCode(code)?.accent ?? cupByCode(code)?.accent ?? C.line) : C.line;
    const src = code ? png("leagues", code) : null;
    return (
      <div style={{ display: "flex", width: 40, height: 40, borderRadius: 10, background: code && WHITE_LOGO.has(code) ? accent : "#ffffff", alignItems: "center", justifyContent: "center" }}>
        {src ? <img src={src} width={30} height={30} style={{ objectFit: "contain" }} /> : <span style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 18, color: "#0b1018" }}>UNL</span>}
      </div>
    );
  };

  const image = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.bg, color: C.ink, fontFamily: "Barlow", padding: "56px 48px 44px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 72, lineHeight: 1 }}>{up(title)}</span>
          <span style={{ fontFamily: "Barlow Condensed", fontWeight: 600, fontSize: 38, color: C.accent, letterSpacing: 2 }}>{up(f.longDay(`${date}T12:00:00Z`))}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, marginTop: 34, gap: 10 }}>
          {shown.map((r) => {
            const pick = pickOf(r.p as [number, number, number]);
            return (
              <div key={r.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.card, borderRadius: 18, padding: "12px 18px", flex: 1, maxHeight: 112 }}>
                {mark(r.comp)}
                {side(r.home, "left", pick === 0)}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 170 }}>
                  <span style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 46, lineHeight: 1 }}>{`${r.score[0]}-${r.score[1]}`}</span>
                  <span style={{ fontSize: 20, color: C.muted }}>
                    {f.time(r.kickoff)} · {f.pct(Math.max(...r.p))}
                  </span>
                </div>
                {side(r.away, "right", pick === 2)}
              </div>
            );
          })}
          {rows.length > ROWS && <div style={{ display: "flex", justifyContent: "center", fontSize: 26, color: C.muted }}>{t.sharePick.more(rows.length - ROWS)}</div>}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 26, borderTop: `2px solid ${C.line}`, paddingTop: 20 }}>
          <span style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 44, letterSpacing: 4 }}>RINVALO</span>
          <span style={{ fontSize: 28, color: C.muted }}>rinvalo.net</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, fonts: FONTS, headers: { "Cache-Control": CACHE } },
  );
  // Instagram takes only JPEG, read from a public address: ?jpg=1 serves the same image as JPEG.
  if (!new URL(req.url).searchParams.has("jpg")) return image;
  const jpg = await sharp(Buffer.from(await image.arrayBuffer())).flatten({ background: C.bg }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": CACHE } });
}

const CACHE = "public, max-age=600, s-maxage=1800, stale-while-revalidate=3600";
