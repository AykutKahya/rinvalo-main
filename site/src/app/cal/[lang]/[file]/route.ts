import { getMatches, seasonTeams } from "@/lib/data";
import { fmt } from "@/lib/format";
import { dict, paths, roundLabel, type Lang } from "@/lib/i18n";
import { competitionName } from "@/lib/leagues";
import { siteUrl } from "@/lib/site";
import { team } from "@/lib/teams";

// One calendar per club and language, e.g. /cal/tr/galatasaray.ics. Calendar apps poll it, so a
// subscriber gets every kick-off and Rinvalo's pick on their phone without an account.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return seasonTeams().flatMap((t) => (["tr", "en"] as const).map((lang) => ({ lang, file: `${t.slug}.ics` })));
}

const stamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
/** RFC 5545 lines are folded at 75 octets. */
const fold = (line: string) => {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 74) {
    let cut = 74;
    while (Buffer.byteLength(rest.slice(0, cut)) > 74) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
};

export async function GET(_: Request, { params }: { params: Promise<{ lang: string; file: string }> }) {
  const { lang: raw, file } = await params;
  const lang: Lang = raw === "en" ? "en" : "tr";
  const slug = file.replace(/\.ics$/, "");
  const t = dict(lang);
  const f = fmt(lang);
  const p = paths(lang);
  const name = (s: string) => team(s, lang).name;
  const now = stamp(new Date().toISOString());
  const events = getMatches()
    .filter((m) => m.home === slug || m.away === slug)
    .map((m) => {
      const pr = m.prediction;
      const title = m.status === "finished" ? `${name(m.home)} ${m.hg}-${m.ag} ${name(m.away)}` : `${name(m.home)} – ${name(m.away)}`;
      const lines = [`${competitionName(m.league, lang)} · ${roundLabel(lang, m.league, m.round)}`];
      if (pr) lines.push(`${t.match.prediction}: ${pr.score[0]}-${pr.score[1]} (1 ${f.pct(pr.p[0])} · X ${f.pct(pr.p[1])} · 2 ${f.pct(pr.p[2])})`);
      lines.push(`${siteUrl}${p.matchOf(m.id)}`);
      const end = new Date(Date.parse(m.kickoff) + 2 * 3600_000).toISOString();
      return [
        "BEGIN:VEVENT",
        `UID:${m.id}@rinvalo`,
        `DTSTAMP:${now}`,
        `DTSTART:${stamp(m.kickoff)}`,
        `DTEND:${stamp(end)}`,
        `SUMMARY:${esc(title)}`,
        `DESCRIPTION:${esc(lines.join("\n"))}`,
        ...(m.venue ? [`LOCATION:${esc(m.venue)}`] : []),
        `URL:${siteUrl}${p.matchOf(m.id)}`,
        ...(m.status === "postponed" ? ["STATUS:CANCELLED"] : []),
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "TRIGGER:-PT30M",
        `DESCRIPTION:${esc(title)}`,
        "END:VALARM",
        "END:VEVENT",
      ];
    });
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rinvalo//Fixtures//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(`${name(slug)} · Rinvalo`)}`,
    "X-PUBLISHED-TTL:PT6H",
    ...events.flat(),
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n");
  return new Response(body + "\r\n", { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
}
