import type { Metadata } from "next";
import { Anton, Archivo } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { getEngineBacktest, getMatches, getSimulation, leagueTable, LEAGUES, type MatchView } from "@/lib/data";
import { fmt, type Format } from "@/lib/format";
import { alternates, dict, paths, type Lang } from "@/lib/i18n";
import { nameLang } from "@/lib/leagues";
import { pickOf } from "@/lib/model";
import { matchOfTheWeek, recentResults, upcoming } from "@/lib/picks";
import type { TableRow } from "@/lib/table";
import { team, teamLang } from "@/lib/teams";
import { TeamPair } from "@/components/TeamPair";
import s from "./headlines.module.css";

const anton = Anton({ subsets: ["latin", "latin-ext"], weight: "400", variable: "--font-anton", display: "swap" });
const archivo = Archivo({ subsets: ["latin", "latin-ext"], weight: ["400", "600", "800"], variable: "--font-archivo", display: "swap" });

export function headlinesMetadata(lang: Lang): Metadata {
  const t = dict(lang).headlines;
  return { title: t.title, description: t.description, alternates: alternates(lang, "headlines") };
}

type Copy = {
  headline: (m: MatchView, f: Format) => { text: ReactNode; sub: string };
  why: (m: MatchView, table: TableRow[], f: Format) => string;
};

const winsInLast5 = (r?: TableRow) => r?.form.filter((x) => x === "G").length ?? 0;

const TR: Copy = {
  headline(m, f) {
    const p = m.prediction!;
    const pick = pickOf(p.p);
    const h = team(m.home).name;
    const a = team(m.away).name;
    const sc = `${p.score[0]}-${p.score[1]}`;
    if (Math.max(...p.p) < 0.42 || pick === 1)
      return {
        text: (
          <>
            {h} – {a}: <em>kazananı yok</em>
          </>
        ),
        sub: `Dengeli maç, beraberlik ${f.pct(p.p[1])}.`,
      };
    if (pick === 0)
      return {
        text: (
          <>
            {h} evinde <em>{f.pct(p.p[0])}</em> favori
          </>
        ),
        sub: `Tahmin ${sc}.`,
      };
    return {
      text: (
        <>
          {a} deplasmanda <em>{f.pct(p.p[2])}</em> favori
        </>
      ),
      sub: `Tahmin ${sc}.`,
    };
  },
  why(m, table, f) {
    const p = m.prediction!;
    const h = table.find((r) => r.team === m.home);
    const a = table.find((r) => r.team === m.away);
    const wins = (n: number) => (n === 5 ? "5'ini de" : `${n}'ünü`);
    if (winsInLast5(h) >= 4) return `${team(m.home).name} son 5 maçın ${wins(winsInLast5(h))} kazandı.`;
    if (winsInLast5(a) >= 4) return `${team(m.away).name} son 5 maçın ${wins(winsInLast5(a))} kazandı.`;
    if (p.over25 > 0.6) return `2.5 üst ${f.pct(p.over25)}.`;
    if (p.over25 < 0.42) return `2.5 alt ${f.pct(1 - p.over25)}.`;
    if (p.btts > 0.58) return `Karşılıklı gol ${f.pct(p.btts)}.`;
    return "";
  },
};

const EN: Copy = {
  headline(m, f) {
    const p = m.prediction!;
    const pick = pickOf(p.p);
    const h = team(m.home, "en").name;
    const a = team(m.away, "en").name;
    const sc = `${p.score[0]}-${p.score[1]}`;
    if (Math.max(...p.p) < 0.42 || pick === 1)
      return {
        text: (
          <>
            {h} – {a}: <em>too close to call</em>
          </>
        ),
        sub: `Even game, draw ${f.pct(p.p[1])}.`,
      };
    if (pick === 0)
      return {
        text: (
          <>
            {h} <em>{f.pct(p.p[0])}</em> favourites at home
          </>
        ),
        sub: `Pick: ${sc}.`,
      };
    return {
      text: (
        <>
          {a} <em>{f.pct(p.p[2])}</em> favourites away
        </>
      ),
      sub: `Pick: ${sc}.`,
    };
  },
  why(m, table, f) {
    const p = m.prediction!;
    const h = table.find((r) => r.team === m.home);
    const a = table.find((r) => r.team === m.away);
    const wins = (n: number) => (n === 5 ? "all of their last 5" : `${n} of their last 5`);
    if (winsInLast5(h) >= 4) return `${team(m.home, "en").name} have won ${wins(winsInLast5(h))}.`;
    if (winsInLast5(a) >= 4) return `${team(m.away, "en").name} have won ${wins(winsInLast5(a))}.`;
    if (p.over25 > 0.6) return `Goals expected: over 2.5 at ${f.pct(p.over25)}.`;
    if (p.over25 < 0.42) return `A tight one: under 2.5 at ${f.pct(1 - p.over25)}.`;
    if (p.btts > 0.58) return `Both teams to score: ${f.pct(p.btts)}.`;
    return "";
  },
};

export function Headlines({ lang }: { lang: Lang }) {
  const f = fmt(lang);
  const d = dict(lang);
  const t = d.headlines;
  const path = paths(lang);
  const copy = lang === "en" ? EN : TR;
  const name = (slug: string) => <span lang={teamLang(slug, lang)}>{team(slug, lang).name}</span>;
  const now = Date.now();
  const all = getMatches();
  const sim = getSimulation();
  const lead = matchOfTheWeek(all, sim, now);
  const recent = recentResults(all, now, 7).slice(0, 6);
  const recentHits = recent.filter((m) => m.hit).length;
  // Report card: every graded game of the last week, its boldest right call and its biggest miss.
  const graded = recentResults(all, now, 7);
  const sure = (m: MatchView) => Math.max(...m.prediction!.p);
  const bold = graded.filter((m) => m.hit).sort((a, b) => sure(a) - sure(b))[0];
  const miss = graded.filter((m) => !m.hit).sort((a, b) => sure(b) - sure(a))[0];
  const bt = getEngineBacktest()?.overall["Rinvalo modeli"];
  const week = upcoming(all, now, 7);
  const race = (sim.leagues["super-lig"] ?? []).slice().sort((x, y) => y.champion - x.champion).slice(0, 3);
  const round = week.find((m) => m.league === "super-lig")?.round;

  const hd = lead ? copy.headline(lead, f) : null;

  return (
    <div className={`${anton.variable} ${archivo.variable}`}>
      <div className={s.paper}>
        <div className={s.mast}>
          <div className={s.logo} lang="en">
            Rinvalo
          </div>
          <div className={s.date}>
            {f.fullDate(now)}
            <br />
            {round ? `Süper Lig · ${d.roundCap(round)}` : t.weekGames}
          </div>
        </div>
        <nav className={s.menu} aria-label={t.leaguesNav}>
          {LEAGUES.map((l) => (
            <a key={l.code} href={`#${l.code}`} lang={nameLang(l.code)}>
              {l.name}
            </a>
          ))}
          <Link href={path.accuracy}>{t.didItHit}</Link>
        </nav>

        <div className={s.front}>
          {lead && hd ? (
            <div className={s.lead}>
              <span className={s.tag}>
                {t.motw} · {f.shortDay(lead.kickoff)} {f.time(lead.kickoff)}
              </span>
              <h1 className={s.headline} lang={lang === "en" ? "en" : nameLang(lead.league)}>
                {hd.text}
              </h1>
              <p>
                {hd.sub} {copy.why(lead, leagueTable(lead.league), f)}
              </p>
              <div className={s.bignums}>
                {lead.prediction!.p.map((v, i) => (
                  <div key={i} className={i === pickOf(lead.prediction!.p) ? s.hot : undefined}>
                    <b>{f.pct(v)}</b>
                    <span lang={i === 1 ? lang : nameLang(lead.league)}>{i === 0 ? name(lead.home) : i === 1 ? d.draw : name(lead.away)}</span>
                  </div>
                ))}
              </div>
              <Link href={path.matchOf(lead.id)} className={s.more}>
                {t.allOdds}
              </Link>
            </div>
          ) : (
            <div className={s.lead}>
              <h1 className={s.headline}>{t.noGames}</h1>
            </div>
          )}
          <aside className={s.rail}>
            <h2>{t.lastWeek}</h2>
            {recent.length ? (
              <>
                <div className={s.pct}>
                  {recentHits}/{recent.length}
                </div>
                <p>{t.lastN(recent.length)}</p>
                <ol>
                  {recent.map((m) => (
                    <li key={m.id}>
                      <Link href={path.matchOf(m.id)}>
                        <TeamPair home={m.home} away={m.away} lang={lang} score={`${m.hg}-${m.ag}`} />
                        <span className={m.hit ? s.ok : s.no}>{m.exact ? t.exact : m.hit ? t.hit : t.miss}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <>
                <div className={s.pct}>{bt ? f.pct(bt.accuracy) : "–"}</div>
                <p>{t.last3}</p>
                <Link href={path.accuracy} className={s.ok} style={{ alignSelf: "flex-start" }}>
                  {t.report}
                </Link>
              </>
            )}
          </aside>
        </div>

        {graded.length >= 5 && (
          <div className={s.report}>
            <span className={s.raceHead}>{t.card}</span>
            <div>
              <b>{f.pct(graded.filter((m) => m.hit).length / graded.length)}</b>
              <span>
                {t.cardHits} · {graded.filter((m) => m.hit).length}/{graded.length}
              </span>
            </div>
            <div>
              <b>{graded.filter((m) => m.exact).length}</b>
              <span>{t.cardExact}</span>
            </div>
            {bold && (
              <Link href={path.matchOf(bold.id)}>
                <em lang={nameLang(bold.league)}>
                  {name(bold.home)} {bold.hg}-{bold.ag} {name(bold.away)}
                </em>
                <span>
                  {t.cardBold} · {t.cardChance(f.pct(sure(bold)))}
                </span>
              </Link>
            )}
            {miss && (
              <Link href={path.matchOf(miss.id)}>
                <em lang={nameLang(miss.league)}>
                  {name(miss.home)} {miss.hg}-{miss.ag} {name(miss.away)}
                </em>
                <span>
                  {t.cardMiss} · {t.cardChance(f.pct(sure(miss)))}
                </span>
              </Link>
            )}
          </div>
        )}

        {race.length > 0 && (
          <div className={s.race}>
            <span className={s.raceHead}>{t.race}</span>
            {race.map((r) => (
              <Link key={r.team} href={path.teamOf(r.team)}>
                <b>{f.pct(r.champion)}</b>
                <span lang="tr">{name(r.team)}</span>
              </Link>
            ))}
          </div>
        )}

        <div className={s.prog}>
          {LEAGUES.map((l) => {
            const ms = week.filter((m) => m.league === l.code);
            if (!ms.length) return null;
            const table = leagueTable(l.code);
            return [
              <h2 key={`h-${l.code}`} id={l.code} lang={nameLang(l.code)}>
                {l.name}
              </h2>,
              ...ms.map((m) => {
                const p = m.prediction!;
                const pick = pickOf(p.p);
                return (
                  <Link key={m.id} href={path.matchOf(m.id)} className={s.m}>
                    <div className={s.meta}>
                      <span>
                        {f.shortDay(m.kickoff)} {f.time(m.kickoff)}
                      </span>
                      <b>
                        {f.pct(p.p[pick])} {d.outcomeLower[pick]}
                      </b>
                    </div>
                    <div className={s.line}>
                      <div className={s.nm} lang={nameLang(m.league)}>
                        <TeamPair home={m.home} away={m.away} lang={lang} />
                      </div>
                      <div className={s.sc}>
                        {p.score[0]}-{p.score[1]}
                      </div>
                    </div>
                    {copy.why(m, table, f) && <p className={s.why}>{copy.why(m, table, f)}</p>}
                  </Link>
                );
              }),
            ];
          })}
        </div>
      </div>
    </div>
  );
}
