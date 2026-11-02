import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { WHITE_LOGO } from "@/components/Crest";
import { leagueMatches } from "@/lib/data";
import { fmt } from "@/lib/format";
import { dict, roundLabel, type Lang } from "@/lib/i18n";
import { competitionName, cupByCode, leagueByCode, nameLang } from "@/lib/leagues";
import { pickOf } from "@/lib/model";
import { team } from "@/lib/teams";

// A round's picks as one portrait image (Instagram / X), drawn on request and cached by the CDN.
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
const C = { bg: "#0b1018", card: "#131a24", line: "#243042", ink: "#eef2f7", muted: "#8794a7", accent: "#ffb21e", good: "#4cc2ff" };
const ROWS = 10;

export async function GET(_: Request, { params }: { params: Promise<{ lang: string; code: string; round: string }> }) {
  const { lang: raw, code, round: r } = await params;
  const lang: Lang = raw === "en" ? "en" : "tr";
  const comp = leagueByCode(code) ?? cupByCode(code);
  const round = Number(r);
  const games = comp && /^\d+$/.test(r) ? leagueMatches(code).filter((m) => m.round === round).sort((a, b) => a.kickoff.localeCompare(b.kickoff)) : [];
  if (!comp || games.length === 0) return new Response("Not found", { status: 404 });

  const t = dict(lang);
  const f = fmt(lang);
  // Satori upper-cases without locale rules, so do it here; the brand keeps its dotless I.
  const up = (s: string, l: string = lang) => s.toLocaleUpperCase(l === "tr" ? "tr-TR" : "en-GB").replace("RİNVALO", "RINVALO");
  const shown = games.slice(0, ROWS);
  const logo = png("leagues", code);
  const nl = nameLang(code);

  const side = (slug: string, align: "left" | "right", bold: boolean) => {
    const src = png("crests", slug);
    const img = src ? <img src={src} width={46} height={46} style={{ objectFit: "contain" }} /> : <div style={{ width: 46, height: 46, borderRadius: 23, background: C.line }} />;
    const full = team(slug, lang).name;
    const name = (
      <span style={{ fontFamily: "Barlow Condensed", fontWeight: bold ? 800 : 600, fontSize: full.length > 17 ? 26 : full.length > 13 ? 30 : 34, color: bold ? C.ink : C.muted, lineHeight: 1, textAlign: align }}>
        {up(full, nl)}
      </span>
    );
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 14, width: 330, justifyContent: align === "left" ? "flex-start" : "flex-end" }}>
        {align === "left" ? img : name}
        {align === "left" ? name : img}
      </div>
    );
  };

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.bg, color: C.ink, fontFamily: "Barlow", padding: "56px 56px 44px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {logo && (
            <div style={{ display: "flex", width: 92, height: 92, borderRadius: 20, background: WHITE_LOGO.has(code) ? comp.accent : "#ffffff", alignItems: "center", justifyContent: "center" }}>
              <img src={logo} width={70} height={70} style={{ objectFit: "contain" }} />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 64, lineHeight: 1 }}>{up(competitionName(code, lang))}</span>
            <span style={{ fontFamily: "Barlow Condensed", fontWeight: 600, fontSize: 38, color: C.accent, letterSpacing: 2 }}>
              {up(roundLabel(lang, code, round))} · {up(t.sharePick.weekTitle)}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, marginTop: 36, gap: 10 }}>
          {shown.map((m) => {
            const p = m.prediction;
            const pick = p ? pickOf(p.p) : -1;
            const done = m.status === "finished" && m.hg !== null;
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.card, borderRadius: 18, padding: "14px 22px", flex: 1, maxHeight: 96 }}>
                {side(m.home, "left", pick === 0)}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 200 }}>
                  <span style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 46, lineHeight: 1 }}>{p ? `${p.score[0]}-${p.score[1]}` : "–"}</span>
                  {done ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 20, color: m.hit ? C.good : C.muted }}>
                      {t.row.ft} {m.hg}-{m.ag}
                      {m.hit !== null && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d={m.hit ? "M4 12l5 5L20 6" : "M6 6l12 12M18 6L6 18"} />
                        </svg>
                      )}
                    </span>
                  ) : (
                    <span style={{ fontSize: 20, color: C.muted }}>{p ? f.pct(Math.max(...p.p)) : f.time(m.kickoff)}</span>
                  )}
                </div>
                {side(m.away, "right", pick === 2)}
              </div>
            );
          })}
          {games.length > ROWS && <div style={{ display: "flex", justifyContent: "center", fontSize: 26, color: C.muted }}>{t.sharePick.more(games.length - ROWS)}</div>}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 26, borderTop: `2px solid ${C.line}`, paddingTop: 20 }}>
          <span style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 44, letterSpacing: 4 }}>RINVALO</span>
          <span style={{ fontSize: 28, color: C.muted }}>rinvalo.net</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, fonts: FONTS, headers: { "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
