# Rinvalo v2 (site/)

Futbol maçlarını takip eden, her maç için skor ve sonuç tahmini yayınlayan site. Tamamen ücretsiz
çalışır: veri kaynağı için anahtar veya ödeme gerekmez, veritabanı yoktur.

## Nasıl çalışır

```
TheSportsDB (ücretsiz) ──┐
openfootball (yedek) ────┼─> scripts/update.ts ─┐
data/overrides.json ─────┘                      ├─> engine/predict.py ─> scripts/simulate.ts ─> git commit ─> Vercel
football-data.co.uk ───────> scripts/stats.ts ──┘
```

- `.github/workflows/rinvalo-site-bot.yml` botu günde 6 kez çalıştırır. Bot yeni veri bulursa JSON
  dosyalarını `main`'e commit eder, Vercel de siteyi yeniden derler.
- Tahminler maç başlayana kadar her koşuda yenilenir. Maç başladıktan sonra tahmin dondurulur ve
  başarı oranı bu dondurulmuş tahminle hesaplanır.
- Tahmin motoru Python'dadır: [`engine/`](../engine/README.md). `src/lib/model.ts` içindeki basit model
  yalnız yedektir; motor bir koşuda hata verirse onun tahminleri yerinde kalır.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `data/history.json` | 2021-2026 arası 8.980 maç (football-data.co.uk sezon dosyalarından bir kez dönüştürüldü) |
| `data/season.json` | Bu sezonun fikstürü ve sonuçları (bot yazar) |
| `data/predictions.json` | Her maçın tahmini (bot yazar) |
| `data/simulation.json` | Şampiyonluk, Avrupa ve küme düşme ihtimalleri (bot yazar) |
| `data/overrides.json` | **Elle düzeltmeler** (sen yazarsın) |
| `data/stats-history.json`, `data/stats-current.json` | Şut, isabetli şut, xG ve bahis oranları (football-data.co.uk) |
| `data/odds-upcoming.json`, `data/market.json` | Yaklaşan ve oynanmış maçların piyasa olasılıkları |
| `data/engine-backtest.json` | Motorun geriye dönük test sonucu (`npm run backtest`) |

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
