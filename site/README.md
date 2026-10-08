# Rinvalo v2 (site/)

Futbol maçlarını takip eden, her maç için skor ve sonuç tahmini yayınlayan site. Tamamen ücretsiz
çalışır: veri kaynağı için anahtar veya ödeme gerekmez, veritabanı yoktur.

## Nasıl çalışır

```
TheSportsDB (ücretsiz) ─┐
openfootball (yedek) ───┼─> scripts/update.ts ──> data/*.json ──> git commit ──> Vercel derlemesi
data/overrides.json ────┘          │
                           model + simülasyon
```

- `.github/workflows/rinvalo-site-bot.yml` botu günde 6 kez çalıştırır. Bot yeni veri bulursa JSON
  dosyalarını `main`'e commit eder, Vercel de siteyi yeniden derler.
- Tahminler maç başlayana kadar her koşuda yenilenir. Maç başladıktan sonra tahmin dondurulur ve
  başarı oranı bu dondurulmuş tahminle hesaplanır.
- Model: zaman ağırlıklı Poisson + Dixon-Coles (`src/lib/model.ts`). 2024-25 ve 2025-26 sezonlarının
  3.540 maçlık geriye dönük testinde 1-X-2 isabeti %52,1 (bahis şirketi favorisi %54,0).

## Dosyalar

| Dosya | İçerik |
|---|---|
| `data/history.json` | 2021-2026 arası 8.980 maç (football-data.co.uk sezon dosyalarından bir kez dönüştürüldü) |
| `data/season.json` | Bu sezonun fikstürü ve sonuçları (bot yazar) |
| `data/predictions.json` | Her maçın tahmini (bot yazar) |
| `data/simulation.json` | Şampiyonluk, Avrupa ve küme düşme ihtimalleri (bot yazar) |
| `data/overrides.json` | **Elle düzeltmeler** (sen yazarsın) |
| `data/backtest.json` | Geriye dönük test sonucu (`npm run backtest`) |

## Bir skoru veya tarihi elle düzeltmek

Bot bir skoru yanlış çekerse ya da hiç çekemezse GitHub'da `site/data/overrides.json` dosyasını
düzenle. Maç kimliği sitedeki adresin sonudur (`/mac/rizespor-fenerbahce`).

```json
{
  "results": { "rizespor-fenerbahce": { "hg": 1, "ag": 2 } },
  "kickoffs": { "galatasaray-kasimpasa": "2026-10-09T18:00:00Z" },
  "postponed": ["eyupspor-goztepe"]
}
```

Saatler UTC yazılır (Türkiye saati eksi 3). Sonraki bot koşusunda uygulanır.

## Yerelde çalıştırma

```bash
cd site
npm install
npm run update      # veriyi güncelle (FULL=1 ile bütün sezon)
npm test
npm run build && npm start
```

## Vercel

Vercel projesinde **Root Directory** `site` olmalı. Ortam değişkeni gerekmez.
