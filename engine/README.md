# Rinvalo tahmin motoru

Python ile yazılmış, her maç için 1-X-2, skor, 2.5 üst/alt ve karşılıklı gol olasılığı üreten motor.
Bot (`.github/workflows/rinvalo-site-bot.yml`) her koşuda `engine/predict.py`'ı çalıştırır.

## Bileşenler

| Bileşen | Ne yapar |
|---|---|
| Gol modeli | Skorlardan zaman ağırlıklı Poisson hücum/savunma gücü (Dixon-Coles düzeltmeli), yarı ömür 240 gün |
| Şut/xG modeli | Aynı yapı, hedef olarak xG (bu sezondan itibaren) ya da isabetli şuttan türetilmiş xG; yarı ömür 150 gün |
| Elo | Gol farkı ağırlıklı, ev avantajlı; her sezon başında ortalamaya %30 çekilir |
| Birleştirme | Üç bileşenin olasılıklarını standartlaştırılmış, düzenlileştirilmiş çok sınıflı lojistik regresyonla birleştirir |
| Güven | Fark büyüklüğü, bileşenlerin ve (varsa) piyasanın aynı sonucu gösterip göstermediği |
| Piyasa | football-data.co.uk ortalama oranlarından kâr payı çıkarılmış olasılık; yalnız gösterilir ve güveni etkiler, tahmine karışmaz |

Bütün özellikler maç öncesi bilinen verilerle hesaplanır (`features.py`, `test_features_use_only_the_past`).

## Geriye dönük test (2023-24 – 2025-26, 5.366 maç)

Her test sezonu için model yalnız önceki sezonlarla kuruldu. `python engine/backtest.py` yeniden üretir
ve sonucu `site/data/engine-backtest.json`'a yazar.

| Yöntem | İsabet | Log loss | Brier |
|---|---|---|---|
| Eski model (yalnız skorlar) | %52,6 | 0,9812 | 0,5843 |
| **Rinvalo modeli** | **%52,7** | **0,9781** | **0,5828** |
| Piyasa (maç öncesi oranlar) | %54,7 | 0,9597 | 0,5698 |
| Piyasa (kapanış oranları) | %55,4 | 0,9566 | 0,5678 |

Güven: yüksek %65 (2.247 maç), orta %49 (1.786), düşük %36 (1.333).

### Denenen ve elenenler

- **LightGBM** (40 özellik: form 5/10/20, iç/dış saha, dinlenme, motivasyon, derbi, xG trendi...):
  log loss 1,017; ezberliyor. Sadeleştirilmiş sürümler de (0,987) basit birleştirmeyi geçemedi.
- **Ablation:** form, Elo ve şut/xG özellikleri boosting modeline ayrı ayrı eklendiğinde log loss'u
  kötüleştirdi; yalnız bağlam grubu (dinlenme, motivasyon, derbi) +0,0007 katkı verdi.
- **Kısa veri penceresi:** yalnız son 1 ya da 2 sezonla kurmak 5 sezondan kötü (0,9942 / 0,9886 vs 0,9873).
- **Piyasa karışımı:** en iyi karışım (geriye dönük, iyimser) modele sıfır ağırlık veriyor. Ücretsiz
  verilerle piyasanın bilmediği bir bilgi yakalanamıyor; piyasa sakatlık ve ilk 11'i fiyatlıyor.
- **Ekim 2026, 9 lig (2023-26, walk-forward; temel: isabet %52,16, log loss 0,9831):**
  - Beraberlik göstergeleri (dc/xq beraberlik, toplam gol, güç farkı): 0,9826, isabet %52,09.
  - Lig başına sabit: 0,9837 (kötü).
  - Dinlenme farkı: 0,9832.
  - Avrupa kupaları dahil ortak Elo farkı (`engine/cups.py`): ek olarak 0,9829, Elo yerine 0,9828.
  - Kupa yorgunluğu (son 4 günde Avrupa maçı, kupa dahil dinlenme): 0,9839 (kötü).

  Hiçbiri gürültüden büyük değil; model değiştirilmedi.
- **Kasım 2026, sonradan kalibrasyon (2023-26, walk-forward, ayar yalnız önceki sezonların
  tahminleriyle; temel log loss 0,9831):** genel sıcaklık 0,9832, genel sıcaklık + sınıf kayması
  0,9832, lig başına sıcaklık 0,9842, lig başına sıcaklık + kayma 0,9858. Model zaten kalibre;
  lig başına ayar ezberliyor. Değiştirilmedi.
- **Kasım 2026, skor seçme kuralları (2023-26, 9.776 maç):** favori içinde en olası skor (şimdiki)
  tam skor %11,2; tek başına en olası skor %13,3 ama maçların %65'ine 1-1 diyor ve sonuç isabeti
  %41'e düşüyor; gol beklentisini yuvarlamak %11,4 / sonuç %48; tahmin ligi puanını (3/1) en
  çoklamak %11,9 / %51,4 ve %11 beraberlik. Kural değiştirilmedi; skor çeşitliliği gol modelinin
  kendisini iyileştirerek (kadro verisi) ele alınacak.
- **Kasım 2026, değer analizi (2023-26, ortalama maç öncesi oranlar, marj %5,7):** modelin
  "piyasadan iyi" dediği her sonuca oynamak getiriyi %-15 (eşik %0) ile %-23 (eşik %12) arasında
  bırakıyor; model piyasadan düz olduğu için sistematik olarak zayıf tarafı seçiyor. Sitede
  "değer var" kararı yayınlanmıyor. 2.5 alt/üst için de %-7.
- **Kasım 2026, veri yeterliliği etiketi:** kulübü az gördüğümüz ya da sezonun ilk haftalarındaki
  maçlar ("zayıf") daha kötü tahmin edilmiyor (log loss 0,976, "güçlü" 0,982). Etiket güvenilirlik
  hakkında yanlış bir şey söyleyeceği için eklenmedi; güven seviyesi bu işi görüyor. Maçların %25,8'i berabere bitse de
  beraberlik neredeyse hiç en olası sonuç olmuyor: piyasa 10.300 maçın yalnız 5'inde beraberliği
  favori gösteriyor.
- **Kasım 2026, deplasman mesafesi (M3):** 249 kulübün stat konumu (Wikidata + Open-Meteo
  geocoding) ile iki stat arası km; 2023-26, 9.776 maç, ileriye dönük. log(km) eklemek 1X2 log
  loss'u 0,98430'dan 0,98416'ya indiriyor (fark -0,00014 ± 0,00029, gürültü); 800 km üstü bayrağı
  da öyle. Yalnız Süper Lig için: -0,0014 ± 0,0018 (1.028 maç), anlamsız. Eklenmedi.
- **Kasım 2026, hava durumu (M3):** ev sahibinin stadında maç günü yağış, en yüksek rüzgâr ve
  ortalama sıcaklık (NASA POWER, 13 kulüp Open-Meteo), ayrıca şiddetli yağmur (>5 mm), sert
  rüzgâr (>35 km/sa), sıcak (>25 °C), soğuk (<3 °C) bayrakları; 2023-26, 9.776 maç. 1X2 log loss
  0,9843 -> 0,9847, 2.5 üst Brier 0,2426 -> 0,2428, isabet %56,9 -> %56,5: kötüleştiriyor.
  Eklenmedi; mesafe ile birlikte de (0,9846) aynı.

## Canlı izleme

`engine/track.py` her bot koşusunda bu sezonun dondurulmuş tahminlerini sonuçlarla karşılaştırır ve
`site/data/tracking.json`'a lig lig isabet, log loss ve piyasa log loss'u yazar. Bir ligin bu sezonki
log loss'u testtekinden iki standart hatadan fazla kötüyse (en az 30 maç) lig "izleniyor" olur:
başarı sayfasında görünür ve GitHub Actions koşusunda uyarı çıkar. 2.5 alt/üst ve karşılıklı gol
için isabet ve Brier, "her maça o sezonun daha sık sonucunu söyle" çıtasıyla birlikte yazılır.
Piyasa oranı kaydedilmiş maçlarda aynı ölçüler piyasa için de yazılır (`market`).

## Piyasa oranları

`site/scripts/odds.ts` her bot koşusunda MoviOdds'tan (ücretsiz, anahtarsız, tek gzip istek) maç
sonucu, 2.5 alt/üst ve karşılıklı gol fiyatlarını alır, lig ve kupa maçlarımızla eşleştirir ve
`site/data/odds-moviodds.json`'a yazar. football-data.co.uk ortalaması olan lig maçlarında 1X2 ve
alt/üst için o kullanılır, yoksa MoviOdds. Oranlar marjı atılmış olasılık olarak tahmine
`market`, `marketOver25`, `marketBtts` diye kaydedilir; tahminin kendisine girmez.

## Çalıştırma

```bash
python -m pip install -r engine/requirements.txt
python -m unittest discover -s engine
python engine/backtest.py
python engine/predict.py
python engine/track.py
```
