import { fmt } from "@/lib/format";
import { dict, type Lang } from "@/lib/i18n";
import { CountUp } from "./CountUp";

function Bar({ p }: { p: [number, number, number] }) {
  return (
    <div className="pbar">
      <span className="h" style={{ width: `${p[0] * 100}%` }} />
      <span className="d" style={{ width: `${p[1] * 100}%` }} />
      <span className="a" style={{ width: `${p[2] * 100}%` }} />
    </div>
  );
}

/** "Piyasa ne diyor": Rinvalo's 1-X-2 next to the margin-free betting market. */
export function MarketCompare({
  rinvalo,
  market,
  home,
  away,
  finished,
  lang,
  nameLang,
}: {
  rinvalo: [number, number, number];
  market: [number, number, number] | null | undefined;
  home: string;
  away: string;
  finished: boolean;
  lang: Lang;
  /** Language of the team names, for correct upper-casing. */
  nameLang: "tr" | "en";
}) {
  const t = dict(lang).market;
  const { pct } = fmt(lang);
  const name = (i: number) => (i === 0 ? home : i === 2 ? away : dict(lang).draw.toLocaleLowerCase(dict(lang).locale));
  const rp = rinvalo.indexOf(Math.max(...rinvalo));
  const mp = market ? market.indexOf(Math.max(...market)) : -1;
  const same = market && rp === mp;

  return (
    <section className="card card-pad market">
      <div className="section-title" style={{ margin: 0 }}>
        <h2>{t.title}</h2>
      </div>
      <div className="mk-grid" role="table" aria-label={t.aria} lang={nameLang}>
        <span role="columnheader" />
        <span role="columnheader" className="mk-h">
          {home}
        </span>
        <span role="columnheader" className="mk-h">
          {t.drawCol}
        </span>
        <span role="columnheader" className="mk-h">
          {away}
        </span>
        <span role="columnheader" />

        <span className="mk-name" lang="en">
          Rinvalo
        </span>
        {rinvalo.map((v, i) => (
          <b key={i} className={`mk-v${i === rp ? " pick" : ""}`}>
            <CountUp value={v} lang={lang} />
          </b>
        ))}
        <Bar p={rinvalo} />

        <span className="mk-name">{t.market}</span>
        {market ? (
          <>
            {market.map((v, i) => (
              <b key={i} className={`mk-v${i === mp ? " pick" : ""}`}>
                <CountUp value={v} lang={lang} />
              </b>
            ))}
            <Bar p={market} />
          </>
        ) : (
          <span className="mk-wait">{finished ? t.noOdds : t.notYet}</span>
        )}
      </div>
      {market && (
        <p className={`mk-verdict ${same ? "same" : "differ"}`}>
          {same ? (
            <>
              ✓ <b>{t.agree}</b> · {t.both(name(rp))}
            </>
          ) : (
            <>
              ⚠ <b>{t.differ}</b> · {t.split(name(rp), pct(rinvalo[rp]), name(mp), pct(market[mp]))}
            </>
          )}
        </p>
      )}
    </section>
  );
}
