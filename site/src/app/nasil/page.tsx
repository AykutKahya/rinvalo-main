import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Model nasıl çalışıyor?" };

const STEPS = [
  ["Veri", "Beş ligin son beş sezonundaki yaklaşık 9.000 maç ve bu sezon oynanan her maç: skorlar, şutlar, isabetli şutlar ve bu sezondan itibaren maç başı xG (beklenen gol). Her bilgi yalnız maçtan önce bilinen haliyle kullanılır."],
  ["Gol modeli", "Her takıma skorlardan bir hücum ve bir savunma gücü verilir, ev avantajı her lig için ayrı ölçülür. Yakın maçlar daha ağır basar: sekiz ay önceki bir maç bugünkünün yarısı kadar etkilidir."],
  ["Şut ve xG modeli", "Aynı hesap goller yerine pozisyon kalitesiyle (xG, yoksa isabetli şutlar) yapılır. Şanslı ya da şanssız skorları ayıklar ve form değişimini daha hızlı yakalar; hafızası daha kısadır."],
  ["Elo güç puanı", "Her maçtan sonra kazanana puan aktaran bir güç sıralaması. Yaz arasında kadrolar değiştiği için puanlar her sezon başında ortalamaya doğru çekilir."],
  ["Birleştirme", "Üç model, geçmiş sezonlarda en isabetli sonucu verecek şekilde ağırlıklandırılarak tek olasılığa birleştirilir. Daha karmaşık bir yapay öğrenme modeli (LightGBM) de denendi; testte daha kötü sonuç verdiği için kullanılmıyor."],
  ["Skorlar", "Birleşik 1-X-2 olasılığına uyan beklenen gollerden 0-0'dan 10-10'a her skorun olasılığı çıkar. 2.5 üst ve karşılıklı gol bu tablodan hesaplanır."],
  ["Güven ve gerekçe", "Fark büyükse ve modeller aynı sonucu gösteriyorsa güven yüksek, ayrışıyorlarsa düşük olur. Her maçın yanında tahmini en çok etkileyen nedenler yazılır."],
  ["Piyasa karşılaştırması", "Bahis oranları açıklandığında kâr payı çıkarılıp olasılığa çevrilir ve Rinvalo'nun yanında gösterilir. Piyasa farklı bir sonuç bekliyorsa güven düşürülür. Rinvalo'nun kendi tahmini piyasadan etkilenmez."],
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
          Model sakatlık, ceza, ilk 11 ve teknik direktör değişimini bilmez; skor, şut, xG ve form verisinden öğrenir. Bahis piyasası bunları da fiyatladığı için geçmiş testlerde Rinvalo'nun birkaç puan önünde. Bu yüzden tahminler kesin sonuç değildir. Veriler TheSportsDB, football-data.co.uk ve openfootball açık kaynaklarından günde altı kez otomatik alınır.
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
