import type { Metadata } from "next";
import { SurpriseRow } from "@/components/SurpriseRow";
import { getMatches } from "@/lib/data";
import { pct } from "@/lib/format";
import { disagreements, shocks, upsetRisks } from "@/lib/picks";
import { team } from "@/lib/teams";

export const metadata: Metadata = {
  title: "Haftanın sürprizleri",
  description: "Beklenmedik sonuçlar, piyasayla ayrışan tahminler ve favorilerin riskli maçları.",
};

const top = (p: number[]) => p.indexOf(Math.max(...p));

export default function SurprisesPage() {
  const now = Date.now();
  const all = getMatches();
  const shock = shocks(all, now);
  const diff = disagreements(all, now);
  const risk = upsetRisks(all, now);
  const side = (m: (typeof all)[number], i: number) => (i === 0 ? team(m.home).short : i === 2 ? team(m.away).short : "Ber.");

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Analiz</span>
          <h1>Haftanın sürprizleri</h1>
        </div>
      </div>

      <div className="surprise-grid">
        <section className="card group" style={{ margin: 0 }}>
          <div className="group-head">
            <span>Beklenmedik sonuçlar</span>
            <span>Olasılık</span>
          </div>
          {shock.length ? (
            shock.map(({ m, chance }) => <SurpriseRow key={m.id} m={m} figure={pct(chance)} note="ihtimal verilmişti" tone="bad" />)
          ) : (
            <div className="empty">Son haftada sürpriz sonuç yok.</div>
          )}
        </section>

        <div className="stack">
          {diff.length > 0 && (
            <section className="card group" style={{ margin: 0 }}>
              <div className="group-head">
                <span>Piyasayla ayrışanlar</span>
                <span>Rinvalo</span>
              </div>
              {diff.map((m) => {
                const p = m.prediction!;
                const r = top(p.p);
                const k = top(p.market!);
                return (
                  <SurpriseRow key={m.id} m={m} figure={`${side(m, r)} ${pct(p.p[r])}`} note={`Piyasa: ${side(m, k)} ${pct(p.market![k])}`} tone="plain" />
                );
              })}
            </section>
          )}

          {risk.length > 0 && (
            <section className="card group" style={{ margin: 0 }}>
              <div className="group-head">
                <span>Favori ama riskli</span>
                <span>Sürpriz ihtimali</span>
              </div>
              {risk.map(({ m, fav, fp, dog }) => (
                <SurpriseRow key={m.id} m={m} figure={pct(dog)} note={`Favori ${side(m, fav)} ${pct(fp)}`} tone="warn" />
              ))}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
