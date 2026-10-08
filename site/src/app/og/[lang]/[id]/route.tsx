import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getMatch } from "@/lib/data";
import { fmt } from "@/lib/format";
import { dict, type Lang } from "@/lib/i18n";
import { leagueByCode, nameLang } from "@/lib/leagues";
import { pickOf } from "@/lib/model";
import { team } from "@/lib/teams";

// Drawn on request (not at build) so thousands of matches don't slow the bot's deploys; the CDN caches each one.
export const dynamic = "force-dynamic";

const ROOT = process.cwd();
const font = (f: string) => readFileSync(join(ROOT, "assets", "fonts", f));
const FONTS = [
  { name: "Barlow Condensed", data: font("BarlowCondensed-SemiBold.ttf"), weight: 600 as const },
  { name: "Barlow Condensed", data: font("BarlowCondensed-ExtraBold.ttf"), weight: 800 as const },
  { name: "Barlow", data: font("Barlow-Medium.ttf"), weight: 500 as const },
];

function crest(slug: string): string | null {
  const p = join(ROOT, "public", "crests", `${slug}.png`);
  return existsSync(p) ? `data:image/png;base64,${readFileSync(p).toString("base64")}` : null;
}

// Night palette from globals.css.
const C = { bg: "#0b1018", card: "#131a24", line: "#243042", ink: "#eef2f7", muted: "#8794a7", home: "#ffb21e", draw: "#4b5a70", away: "#4cc2ff" };

export async function GET(_: Request, { params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang: raw, id } = await params;
  const lang: Lang = raw === "en" ? "en" : "tr";
  const m = getMatch(id.replace(/\.png$/, ""));
  if (!m) return new Response("Not found", { status: 404 });
  const t = dict(lang);
  const f = fmt(lang);
  const league = leagueByCode(m.league)!;
  const p = m.prediction;
  const h = team(m.home, lang);
  const a = team(m.away, lang);
  const finished = m.status === "finished" && m.hg !== null;
  const pick = p ? pickOf(p.p) : -1;

  // Satori upper-cases without locale rules, so do it here: GALATASARAY, BEŞİKTAŞ, TAHMİNİ.
  const up = (s: string, l: string = lang) => s.toLocaleUpperCase(l === "tr" ? "tr-TR" : "en-GB").replace("RİNVALO", "RINVALO");
  const side = (slug: string, name: string) => {
    const src = crest(slug);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 330, gap: 18 }}>
        {src ? <img src={src} width={150} height={150} style={{ objectFit: "contain" }} /> : <div style={{ width: 150, height: 150, borderRadius: 75, background: C.card }} />}
        <div style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 46, textAlign: "center", lineHeight: 1 }}>{up(name, nameLang(m.league))}</div>
      </div>
    );
  };

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.bg, color: C.ink, fontFamily: "Barlow", padding: "44px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: C.muted }}>
          <span>
            {league.name} · {t.round(m.round)}
          </span>
          <span>
            {f.longDay(m.kickoff)} · {f.time(m.kickoff)}
          </span>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between" }}>
          {side(m.home, h.name)}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontFamily: "Barlow Condensed", fontWeight: 600, fontSize: 26, letterSpacing: 3, color: C.home }}>
              {up(finished ? t.match.result : t.match.prediction)}
            </div>
            <div style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 168, lineHeight: 1 }}>
              {finished ? `${m.hg}-${m.ag}` : p ? `${p.score[0]}-${p.score[1]}` : "–"}
            </div>
            {p && !finished && p.confidence && (
              <div style={{ display: "flex", fontSize: 24, padding: "6px 18px", borderRadius: 99, background: C.card, color: C.ink }}>{t.conf[p.confidence]}</div>
            )}
          </div>
          {side(m.away, a.name)}
        </div>

        {p && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", height: 18, gap: 6 }}>
              {[C.home, C.draw, C.away].map((c, i) => (
                <div key={i} style={{ width: `${p.p[i] * 100}%`, background: c, borderRadius: 9, opacity: i === pick ? 1 : 0.55 }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Barlow Condensed", fontWeight: 600, fontSize: 30 }}>
              <span>
                {h.short} {f.pct(p.p[0])}
              </span>
              <span style={{ color: C.muted }}>X {f.pct(p.p[1])}</span>
              <span>
                {a.short} {f.pct(p.p[2])}
              </span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, borderTop: `2px solid ${C.line}`, paddingTop: 18 }}>
          <span style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 40, letterSpacing: 4 }}>RINVALO</span>
          <span style={{ fontSize: 24, color: C.muted }}>{t.siteTitle.split("·")[1]?.trim()}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: FONTS, headers: { "Cache-Control": "public, max-age=600, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
