import type { Metadata } from "next";
import { Anton, Archivo } from "next/font/google";
import Link from "next/link";
import { getEngineBacktest, getMatches, getSimulation, leagueTable, LEAGUES, type MatchView } from "@/lib/data";
import { fullDate, pct, shortDay, time } from "@/lib/format";
import { pickOf } from "@/lib/model";
import { matchOfTheWeek, recentResults, upcoming } from "@/lib/picks";
import type { TableRow } from "@/lib/table";
import { team } from "@/lib/teams";
import s from "./manset.module.css";

const anton = Anton({ subsets: ["latin", "latin-ext"], weight: "400", variable: "--font-anton", display: "swap" });
const archivo = Archivo({ subsets: ["latin", "latin-ext"], weight: ["400", "600", "800"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = { title: "Manşet", description: "Haftanın maçları ve tahminleri." };

function headline(m: MatchView) {
  const p = m.prediction!;
  const pick = pickOf(p.p);
  const h = team(m.home).name;
  const a = team(m.away).name;
  if (Math.max(...p.p) < 0.42 || pick === 1) return { text: <>{h} – {a}: <em>kazananı yok</em></>, sub: `Model bu maçı çok dengeli görüyor. Beraberlik ${pct(p.p[1])}.` };
  if (pick === 0) return { text: <>{h} evinde <em>{pct(p.p[0])}</em> favori</>, sub: `Rinvalo ${h} galibiyeti bekliyor, en olası skor ${p.score[0]}-${p.score[1]}.` };
  return { text: <>{a} deplasmanda <em>{pct(p.p[2])}</em> favori</>, sub: `Rinvalo ${a} galibiyeti bekliyor, en olası skor ${p.score[0]}-${p.score[1]}.` };
}

/** Uppercase foreign club names without the Turkish dotted İ. */
const langOf = (m: MatchView) => (m.league === "super-lig" ? "tr" : "en");

const winsText = (n: number) => (n === 5 ? "5'ini de" : `${n}'ünü`);

function why(m: MatchView, table: TableRow[]): string {
  const p = m.prediction!;
  const h = table.find((r) => r.team === m.home);
  const a = table.find((r) => r.team === m.away);
  const wins = (r?: TableRow) => r?.form.filter((f) => f === "G").length ?? 0;
  if (h && wins(h) >= 4) return `${team(m.home).name} son 5 maçın ${winsText(wins(h))} kazandı.`;
  if (a && wins(a) >= 4) return `${team(m.away).name} son 5 maçın ${winsText(wins(a))} kazandı.`;
  if (p.over25 > 0.6) return `Gollü maç bekleniyor: 2.5 üst ${pct(p.over25)}.`;
  if (p.over25 < 0.42) return `Az gol bekleniyor: 2.5 alt ${pct(1 - p.over25)}.`;
  if (p.btts > 0.58) return `İki takımın da gol atma ihtimali ${pct(p.btts)}.`;
  return `Beklenen gol ${p.lh.toFixed(1).replace(".", ",")} – ${p.la.toFixed(1).replace(".", ",")}.`;
}

export default function HeadlinePage() {
  const now = Date.now();
  const all = getMatches();
  const sim = getSimulation();
  const lead = matchOfTheWeek(all, sim, now);
  const recent = recentResults(all, now, 7).slice(0, 6);
  const recentHits = recent.filter((m) => m.hit).length;
  const bt = getEngineBacktest()?.overall["Rinvalo modeli"];
  const week = upcoming(all, now, 7);
  const race = (sim.leagues["super-lig"] ?? []).slice().sort((x, y) => y.champion - x.champion).slice(0, 3);
  const round = week.find((m) => m.league === "super-lig")?.round;

  const hd = lead ? headline(lead) : null;

  return (
    <div className={`${anton.variable} ${archivo.variable}`}>
      <div className={s.paper}>
        <div className={s.mast}>
          <div className={s.logo} lang="en">Rinvalo</div>
          <div className={s.date}>
            {fullDate(new Date(now).toISOString())}
            <br />
            {round ? `Süper Lig · ${round}. Hafta` : "Haftanın maçları"}
          </div>
        </div>
        <nav className={s.menu} aria-label="Ligler">
          {LEAGUES.map((l) => (
            <a key={l.code} href={`#${l.code}`} lang={l.code === "super-lig" ? "tr" : "en"}>
              {l.name}
            </a>
          ))}
          <Link href="/analiz/basari">Tuttu mu?</Link>
        </nav>

        <div className={s.front}>
          {lead && hd ? (
            <div className={s.lead}>
              <span className={s.tag}>
                Haftanın maçı · {shortDay(lead.kickoff)} {time(lead.kickoff)}
              </span>
              <h1 className={s.headline} lang={langOf(lead)}>{hd.text}</h1>
              <p>
                {hd.sub} {why(lead, leagueTable(lead.league))}
              </p>
              <div className={s.bignums}>
                {lead.prediction!.p.map((v, i) => (
                  <div key={i} className={i === pickOf(lead.prediction!.p) ? s.hot : undefined}>
                    <b>{pct(v)}</b>
                    <span lang={langOf(lead)}>{i === 0 ? team(lead.home).name : i === 1 ? "Beraberlik" : team(lead.away).name}</span>
                  </div>
                ))}
              </div>
              <Link href={`/mac/${lead.id}`} className={s.more}>
                Maçın bütün ihtimalleri →
              </Link>
            </div>
          ) : (
            <div className={s.lead}>
              <h1 className={s.headline}>Bu hafta maç yok</h1>
            </div>
          )}
          <aside className={s.rail}>
            <h2>Geçen hafta tuttu mu?</h2>
            {recent.length ? (
              <>
                <div className={s.pct}>
                  {recentHits}/{recent.length}
                </div>
                <p>Son {recent.length} maç</p>
                <ol>
                  {recent.map((m) => (
                    <li key={m.id}>
                      <Link href={`/mac/${m.id}`}>
                        <span>
                          {team(m.home).name} {m.hg}-{m.ag} {team(m.away).name}
                        </span>
                        <span className={m.hit ? s.ok : s.no}>{m.exact ? "TAM SKOR" : m.hit ? "TUTTU" : "TUTMADI"}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <>
                <div className={s.pct}>{bt ? pct(bt.accuracy) : "–"}</div>
                <p>Son 3 sezon isabeti</p>
                <Link href="/analiz/basari" className={s.ok} style={{ alignSelf: "flex-start" }}>
                  KARNEYİ GÖR →
                </Link>
              </>
            )}
          </aside>
        </div>

        {race.length > 0 && (
          <div className={s.race}>
            <span className={s.raceHead}>Süper Lig şampiyonluk ihtimali</span>
            {race.map((r) => (
              <Link key={r.team} href={`/takim/${r.team}`}>
                <b>{pct(r.champion)}</b>
                <span lang="tr">{team(r.team).name}</span>
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
              <h2 key={`h-${l.code}`} id={l.code} lang={l.code === "super-lig" ? "tr" : "en"}>
                {l.name}
              </h2>,
              ...ms.map((m) => {
                const p = m.prediction!;
                const pick = pickOf(p.p);
                return (
                  <Link key={m.id} href={`/mac/${m.id}`} className={s.m}>
                    <div className={s.meta}>
                      <span>
                        {shortDay(m.kickoff)} {time(m.kickoff)}
                      </span>
                      <b>
                        {pct(p.p[pick])} {["ev sahibi", "beraberlik", "deplasman"][pick]}
                      </b>
                    </div>
                    <div className={s.line}>
                      <div className={s.nm} lang={langOf(m)}>
                        {team(m.home).name} – {team(m.away).name}
                      </div>
                      <div className={s.sc}>
                        {p.score[0]}-{p.score[1]}
                      </div>
                    </div>
                    <p className={s.why}>{why(m, table)}</p>
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
