import { pct } from "@/lib/format";
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
}: {
  rinvalo: [number, number, number];
  market: [number, number, number] | null | undefined;
  home: string;
  away: string;
  finished: boolean;
  lang: "tr" | "en";
}) {
  const name = (i: number) => (i === 0 ? home : i === 2 ? away : "beraberlik");
  const rp = rinvalo.indexOf(Math.max(...rinvalo));
  const mp = market ? market.indexOf(Math.max(...market)) : -1;
  const same = market && rp === mp;

  return (
    <section className="card card-pad market">
      <div className="section-title" style={{ margin: 0 }}>
        <h2>Piyasa ne diyor?</h2>
        <span className="muted" style={{ fontSize: 12.5 }}>
          Bahis oranlarından, kâr payı çıkarılarak
        </span>
      </div>
      <div className="mk-grid" role="table" aria-label="Rinvalo ve piyasa olasılıkları" lang={lang}>
        <span role="columnheader" />
        <span role="columnheader" className="mk-h">
          {home}
        </span>
        <span role="columnheader" className="mk-h">
          Ber.
        </span>
        <span role="columnheader" className="mk-h">
          {away}
        </span>
        <span role="columnheader" />

        <span className="mk-name">Rinvalo</span>
        {rinvalo.map((v, i) => (
          <b key={i} className={`mk-v${i === rp ? " pick" : ""}`}>
            <CountUp value={v} />
          </b>
        ))}
        <Bar p={rinvalo} />

        <span className="mk-name">Piyasa</span>
        {market ? (
          <>
            {market.map((v, i) => (
              <b key={i} className={`mk-v${i === mp ? " pick" : ""}`}>
                <CountUp value={v} />
              </b>
            ))}
            <Bar p={market} />
          </>
        ) : (
          <span className="mk-wait">{finished ? "Bu maç için oran kaydı yok." : "Oranlar genelde maçtan 2-5 gün önce açıklanır."}</span>
        )}
      </div>
      {market && (
        <p className={`mk-verdict ${same ? "same" : "differ"}`}>
          {same ? (
            <>
              ✓ <b>Uyumlu:</b> ikisi de {name(rp)} diyor.
            </>
          ) : (
            <>
              ⚠ <b>Ayrışma:</b> Rinvalo {name(rp)} ({pct(rinvalo[rp])}), piyasa {name(mp)} ({pct(market[mp])}) diyor. Bu yüzden güven seviyesi düşürüldü.
            </>
          )}
        </p>
      )}
    </section>
  );
}
