import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeagueMark } from "@/components/Crest";
import { crumbs, JsonLd } from "@/components/JsonLd";
import { MatchRow } from "@/components/MatchRow";
import { getMatches, leagueMatches, type MatchView } from "@/lib/data";
import { fmt } from "@/lib/format";
import { dict, paths, roundLabel, type Lang } from "@/lib/i18n";
import { competitions, CUP_ROUNDS, cupByCode, leagueByCode } from "@/lib/leagues";
import { pickOf } from "@/lib/model";
import { siteUrl } from "@/lib/site";
import { team } from "@/lib/teams";

const DAY = 86_400_000;

/** One page per league round (or cup stage): its games, Rinvalo's picks and the round's highlights. */
function roundsOf(code: string): number[] {
  if (cupByCode(code)) return CUP_ROUNDS.filter((r) => leagueMatches(code).some((m) => m.round === r));
  const l = leagueByCode(code);
  return l ? Array.from({ length: l.rounds }, (_, i) => i + 1).filter((r) => leagueMatches(code).some((m) => m.round === r)) : [];
}

function gamesOf(code: string, round: number): MatchView[] {
  return leagueMatches(code)
    .filter((m) => m.round === round)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

const valid = (code: string, round: string) => /^\d+$/.test(round) && roundsOf(code).includes(Number(round));

/** Every round that has games, for the sitemap. */
export function allWeeks(): { code: string; round: number }[] {
  const codes = [...new Set(getMatches().map((m) => m.league))];
  return codes.flatMap((code) => roundsOf(code).map((round) => ({ code, round })));
}

/** Built ahead: rounds with a game within ten days of the build; the rest render on first visit. */
export function weekParams() {
  const now = Date.now();
  const seen = new Set<string>();
  for (const m of getMatches()) if (Math.abs(Date.parse(m.kickoff) - now) < 10 * DAY) seen.add(`${m.league}|${m.round}`);
  return [...seen].map((k) => ({ code: k.split("|")[0], round: k.split("|")[1] }));
}

function title(code: string, round: number, lang: Lang) {
  const comp = competitions(lang).find((c) => c.code === code)?.name ?? code;
  return { comp, label: roundLabel(lang, code, round), text: dict(lang).week.title(comp, roundLabel(lang, code, round).toLocaleLowerCase(lang === "tr" ? "tr-TR" : "en-GB")) };
}

export function weekMetadata(code: string, round: string, lang: Lang): Metadata {
  if (!valid(code, round)) return {};
  const r = Number(round);
  const { comp, label, text } = title(code, r, lang);
  const n = gamesOf(code, r).length;
  const image = `/og/week/${lang}/${code}/${r}`;
  return {
    title: text,
    description: dict(lang).week.description(comp, label.toLocaleLowerCase(lang === "tr" ? "tr-TR" : "en-GB"), n),
    alternates: {
      canonical: paths(lang).weekOf(code, r),
      languages: { tr: paths("tr").weekOf(code, r), en: paths("en").weekOf(code, r), "x-default": paths("tr").weekOf(code, r) },
    },
    openGraph: { images: [{ url: image, width: 1080, height: 1350 }] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

/** The round's notable games, from the frozen or current predictions. */
export function highlights(games: MatchView[]) {
  const withP = games.filter((m) => m.prediction);
  const by = (score: (m: MatchView) => number) => (withP.length ? withP.reduce((a, b) => (score(b) > score(a) ? b : a)) : null);
  return {
    surest: by((m) => Math.max(...m.prediction!.p)),
    closest: by((m) => -Math.max(...m.prediction!.p)),
    goals: by((m) => m.prediction!.lh + m.prediction!.la),
    draw: by((m) => m.prediction!.p[1]),
  };
}

export function Week({ code, round: raw, lang }: { code: string; round: string; lang: Lang }) {
  if (!valid(code, raw)) notFound();
  const round = Number(raw);
  const d = dict(lang);
  const t = d.week;
  const f = fmt(lang);
  const p = paths(lang);
  const { comp, label, text } = title(code, round, lang);
  const games = gamesOf(code, round);
  const rounds = roundsOf(code);
  const at = rounds.indexOf(round);
  const accent = (leagueByCode(code) ?? cupByCode(code))!.accent;
  const hl = highlights(games);
  const graded = games.filter((m) => m.hit !== null);
  const name = (m: MatchView) => `${team(m.home, lang).name} – ${team(m.away, lang).name}`;
  const pickText = (m: MatchView) => {
    const q = m.prediction!;
    const side = [team(m.home, lang).name, d.match.drawWord, team(m.away, lang).name][pickOf(q.p)];
    return `${side} ${f.pct(Math.max(...q.p))} · ${q.score[0]}-${q.score[1]}`;
  };

  const byDay = new Map<string, MatchView[]>();
  for (const m of games) byDay.set(f.longDay(m.kickoff), [...(byDay.get(f.longDay(m.kickoff)) ?? []), m]);
  const days = [...byDay.keys()];

  const cards: [string, MatchView | null, (m: MatchView) => string][] = [
    [t.surest, hl.surest, pickText],
    [t.closest, hl.closest, (m) => m.prediction!.p.map((x) => f.pct(x)).join(" · ")],
    [t.goals, hl.goals, (m) => `${f.dec(m.prediction!.lh + m.prediction!.la)} ${d.match.goalsWord}`],
    [t.draw, hl.draw, (m) => `X ${f.pct(m.prediction!.p[1])}`],
  ];

  return (
    <>
      <JsonLd
        data={[
          crumbs([
            ["Rinvalo", p.home],
            [comp, p.leagueOf(code)],
            [label, p.weekOf(code, round)],
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: text,
            itemListElement: games.map((m, i) => ({ "@type": "ListItem", position: i + 1, url: `${siteUrl}${p.matchOf(m.id)}`, name: name(m) })),
          },
        ]}
      />
      <div className="page-head">
        <LeagueMark code={code} accent={accent} size={52} />
        <div>
          <h1>{text}</h1>
          {games.length > 0 && <p>{t.intro(games.length, f.longDay(games[0].kickoff), f.longDay(games[games.length - 1].kickoff))}</p>}
        </div>
      </div>

      <div className="week-nav">
        {at > 0 ? <Link href={p.weekOf(code, rounds[at - 1])}>← {roundLabel(lang, code, rounds[at - 1])}</Link> : <span />}
        <Link href={p.leagueOf(code)}>{t.league}</Link>
        {at < rounds.length - 1 ? <Link href={p.weekOf(code, rounds[at + 1])}>{roundLabel(lang, code, rounds[at + 1])} →</Link> : <span />}
      </div>

      {graded.length > 0 && (
        <p className="card card-pad week-record">
          {t.record(
            graded.filter((m) => m.hit).length,
            graded.length,
            graded.filter((m) => m.exact).length,
          )}
        </p>
      )}

      {hl.surest && (
        <div className="week-cards">
          {cards.map(([label, m, detail]) =>
            m ? (
              <Link key={label} href={p.matchOf(m.id)} className="card week-card">
                <small>{label}</small>
                <b>{name(m)}</b>
                <span>{detail(m)}</span>
              </Link>
            ) : null,
          )}
        </div>
      )}

      {days.map((day) => (
        <div key={day} className="card group">
          <div className="group-head">
            <span>{day}</span>
            <span>{d.colsPick}</span>
          </div>
          {byDay.get(day)!.map((m) => (
            <MatchRow key={m.id} m={m} lang={lang} />
          ))}
        </div>
      ))}

      <p style={{ marginTop: 16 }}>
        <a className="btn ghost" href={`/og/week/${lang}/${code}/${round}`} download={`rinvalo-${code}-${round}.png`}>
          {t.image}
        </a>
      </p>
    </>
  );
}
