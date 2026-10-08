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

  Hiçbiri gürültüden büyük değil; model değiştirilmedi. Maçların %25,8'i berabere bitse de
  beraberlik neredeyse hiç en olası sonuç olmuyor: piyasa 10.300 maçın yalnız 5'inde beraberliği
  favori gösteriyor.

## Çalıştırma

```bash
python -m pip install -r engine/requirements.txt
python -m unittest discover -s engine
python engine/backtest.py
python engine/predict.py
```
