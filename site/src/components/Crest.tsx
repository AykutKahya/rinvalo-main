import type { CSSProperties } from "react";
import manifest from "../../data/crests.json";
import { team } from "@/lib/teams";

const HAS_CREST = new Set<string>(manifest.teams);
const HAS_LEAGUE = new Set<string>(manifest.leagues);
const PX = { sm: 20, md: 36, lg: 64 } as const;

export const crestSrc = (slug: string) => (HAS_CREST.has(slug) ? `/crests/${slug}.png` : undefined);
export const leagueSrc = (code: string) => (HAS_LEAGUE.has(code) ? `/leagues/${code}.png` : undefined);

/** Club logo when the bot has stored one, otherwise a badge in the club's colours. */
export function Crest({ slug, size }: { slug: string; size?: "sm" | "md" | "lg" }) {
  const px = PX[size ?? "sm"] ?? 22;
  if (HAS_CREST.has(slug)) {
    // eslint-disable-next-line @next/next/no-img-element -- tiny local PNGs; next/image adds nothing here
    return <img className={`crest img${size ? ` ${size}` : ""}`} src={`/crests/${slug}.png`} alt="" width={px} height={px} loading="lazy" decoding="async" />;
  }
  const t = team(slug);
  const style = { "--c1": t.colors[0], "--c2": t.colors[1] } as CSSProperties;
  return <span className={`crest${size ? ` ${size}` : ""}`} style={style} aria-hidden="true" />;
}

/** Leagues whose published logo is white-only; they are shown on their own colour. */
export const WHITE_LOGO = new Set(["eredivisie", "primeira-liga"]);

/** League logo, or a coloured dot when none is stored. */
export function LeagueMark({ code, accent, size = 18 }: { code: string; accent: string; size?: number }) {
  if (HAS_LEAGUE.has(code)) {
    const chip = WHITE_LOGO.has(code);
    return (
      // eslint-disable-next-line @next/next/no-img-element -- tiny local PNGs
      <img
        className={`league-img${chip ? " chip" : ""}`}
        src={`/leagues/${code}.png`}
        alt=""
        width={size}
        height={size}
        style={chip ? { background: accent, padding: Math.max(2, Math.round(size * 0.14)) } : undefined}
      />
    );
  }
  return <span className="league-dot" style={{ background: accent, width: Math.max(8, size / 2), height: Math.max(8, size / 2) }} />;
}
