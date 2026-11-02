# Rinvalo

Dokuz lig ve üç Avrupa kupası için istatistik modeliyle üretilen skor ve sonuç tahminleri.

- Site: `site/` (Next.js). Ayrıntılar ve elle düzeltme rehberi: [`site/README.md`](site/README.md)
- Bot: `.github/workflows/rinvalo-site-bot.yml`, veriyi ve tahminleri günceller. Veri Supabase
  Storage'da durur; bot repoya commit atmaz.
- Veritabanı: `supabase/` (tahmin ligi şeması ve botun yükleme fonksiyonu).

Tahminler kesin sonuç değildir.
