import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Model nasıl çalışıyor?" };

const STEPS = [
  ["Geçmiş maçlar", "Beş ligin son beş sezonundaki yaklaşık 9.000 maç ve bu sezon oynanan her maç modele girer. Yakın tarihli maçlar daha ağır basar: sekiz ay önceki bir maç bugünkünün yarısı kadar etkilidir."],
  ["Hücum ve savunma gücü", "Her takıma bir hücum ve bir savunma puanı verilir. Ev sahibi avantajı da her lig için ayrıca ölçülür."],
  ["Beklenen gol", "İki takımın puanlarından her iki takım için beklenen gol çıkar. Örneğin 1,8'e 0,9."],
  ["Bütün skorlar", "Beklenen gollerden 0-0'dan 10-10'a kadar her skorun olasılığı hesaplanır. 1-X-2, 2.5 üst ve karşılıklı gol yüzdeleri bu tablodan toplanır."],
  ["Lige yeni çıkanlar", "Hiç verisi olmayan takım, lige yeni çıkan takımların ortalamasıyla başlar ve oynadıkça kendi gücüne yaklaşır. Böylece her maç için tahmin vardır."],
  ["Dondurma", "Tahminler günde altı kez yenilenir. Maç başladığı anda son tahmin dondurulur ve başarı hesabı bununla yapılır."],
];

export default function HowPage() {
  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div>
          <h1>Model nasıl çalışıyor?</h1>
          <p>Kısa ve açık: tahminlerin nereden geldiği.</p>
        </div>
      </div>
      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {STEPS.map(([title, body], i) => (
          <li key={title} className="card card-pad" style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 12 }}>
            <span className="pos eu" style={{ width: 30, height: 30 }}>
              {i + 1}
            </span>
            <div>
              <h2 style={{ fontSize: 16, marginBottom: 4 }}>{title}</h2>
              <p style={{ margin: 0, color: "var(--ink-2)" }}>{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16, marginBottom: 4 }}>Ne bilmez?</h2>
        <p style={{ margin: 0, color: "var(--ink-2)" }}>
          Model sakatlık, ceza, kadro değişikliği ve teknik direktör değişimini bilmez; yalnız skorlardan öğrenir. Bu yüzden tahminler kesin sonuç değildir. Veriler TheSportsDB ve openfootball açık kaynaklarından günde altı kez otomatik alınır.
        </p>
        <p style={{ margin: "10px 0 0" }}>
          <Link href="/basari" className="btn ghost">
            Başarı oranlarını gör
          </Link>
        </p>
      </div>
    </div>
  );
}
