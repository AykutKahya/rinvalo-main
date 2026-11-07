import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { getInternational, type NationalGame } from "@/lib/data";
import { fmt } from "@/lib/format";
import { alternates, dict, type Lang } from "@/lib/i18n";
import { nation, nationSlug } from "@/lib/nations";

function Badge({ name }: { name: string }) {
  const file = `/nations/${nationSlug(name)}.png`;
  if (!existsSync(join(process.cwd(), "public", file))) return <span className="nat-badge" aria-hidden="true" />;
  // eslint-disable-next-line @next/next/no-img-element -- local badge
  return <img className="nat-badge" src={file} alt="" width={22} height={22} loading="lazy" />;
}

export function nationalMetadata(lang: Lang): Metadata {
  const t = dict(lang).national;
  return { title: t.title, description: t.description, alternates: alternates(lang, "national") };
}

const outcome = (h: number, a: number) => (h > a ? 0 : h === a ? 1 : 2);

export function National({ lang }: { lang: Lang }) {
  const t = dict(lang).national;
  const f = fmt(lang);
  const { games, ratings } = getInternational();
  const now = new Date().toISOString();
  const upcoming = games.filter((g) => g.hg === null && g.kickoff > now);
  const results = games.filter((g) => g.hg !== null).reverse().slice(0, 12);
  const days = [...new Set(upcoming.map((g) => f.dayKey(g.kickoff)))];
  const name = (s: string) => nation(s, lang);
  const mine = (g: NationalGame) => (g.home === "Turkey" || g.away === "Turkey" ? "nat-tr" : undefined);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t.title}</h1>
        </div>
      </div>
      <div className="match-grid" style={{ marginTop: 0 }}>
        <div className="stack">
          <section className="card card-pad">
            <div className="section-title">
              <h2>{t.upcoming}</h2>
              <span className="muted" style={{ fontSize: 13 }}>
                {t.nationsLeague}
              </span>
            </div>
            {upcoming.length === 0 && <p className="muted">{t.none}</p>}
            {days.map((d) => {
              const list = upcoming.filter((g) => f.dayKey(g.kickoff) === d);
              return (
                <div key={d} className="nat-day">
                  <div className="lab-round">
                    {f.longDay(list[0].kickoff)} · {t.round(list[0].round)}
                  </div>
                  {list.map((g) => (
                    <div key={g.id} className={`nat-row ${mine(g) ?? ""}`}>
                      <span className="nat-time num">{f.time(g.kickoff)}</span>
                      <span className="nat-teams">
                        <span>
                          <Badge name={g.home} />
                          {name(g.home)}
                        </span>
                        <span>
                          <Badge name={g.away} />
                          {name(g.away)}
                        </span>
                      </span>
                      {g.pred && (
                        <span className="nat-pred">
                          <b className="num">
                            {g.pred.score[0]}-{g.pred.score[1]}
                          </b>
                          <span className="nat-pct num">
                            {f.pct(g.pred.p[0])} · {f.pct(g.pred.p[1])} · {f.pct(g.pred.p[2])}
                          </span>
                          <span className="pbar" aria-hidden="true">
                            <span className="h" style={{ width: `${g.pred.p[0] * 100}%` }} />
                            <span className="d" style={{ width: `${g.pred.p[1] * 100}%` }} />
                            <span className="a" style={{ width: `${g.pred.p[2] * 100}%` }} />
                          </span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </section>

          {results.length > 0 && (
            <section className="card card-pad">
              <div className="section-title">
                <h2>{t.results}</h2>
              </div>
              <div className="mini-list">
                {results.map((g) => {
                  const hit = g.pred ? outcome(g.pred.score[0], g.pred.score[1]) === outcome(g.hg!, g.ag!) : null;
                  return (
                    <div key={g.id} className={`mini-item ${mine(g) ?? ""}`}>
                      <span className="mi-t">
                        <Badge name={g.home} /> {name(g.home)} – {name(g.away)} <Badge name={g.away} />
                        <br />
                        <small className="muted">{f.fullDate(g.kickoff)}</small>
                      </span>
                      <span className="nat-res">
                        {hit !== null && <i className={hit ? "nat-hit" : "nat-miss"} title={hit ? t.hit : t.miss} aria-label={hit ? t.hit : t.miss} />}
                        <b className="num">
                          {g.hg}-{g.ag}
                        </b>
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <aside className="stack">
          <section className="card card-pad">
            <div className="section-title">
              <h2 style={{ fontSize: 16 }}>{t.ranking}</h2>
            </div>
            <table className="std">
              <thead>
                <tr>
                  <th className="c">#</th>
                  <th>{t.team}</th>
                  <th className="c">{t.rating}</th>
                </tr>
              </thead>
              <tbody>
                {ratings.map(([n, r], i) => (
                  <tr key={n} className={n === "Turkey" ? "nat-tr" : undefined}>
                    <td className="c num muted">{i + 1}</td>
                    <td>
                      <span className="tname">
                        <Badge name={n} />
                        {name(n)}
                      </span>
                    </td>
                    <td className="c num">{r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </aside>
      </div>
    </>
  );
}
