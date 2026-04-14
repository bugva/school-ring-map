# Yayınlama notları

Statik bir **Vite** ön yüzü: `npm run build` çıktısı `dist/` klasöründedir. Sunucu veya CDN bu klasörü kökten servis etmelidir.

## Örnekler

- **Netlify / Cloudflare Pages:** Depoyu bağlayın, build komutu `npm run build`, publish dizini `dist`.
- **GitHub Pages (otomatik):** Repoyu GitHub’a push edin (`main` veya `master`). **Settings → Pages → Build and deployment → Source: GitHub Actions** seçin. Workflow: [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml). Site adresi genelde `https://KULLANICI.github.io/REPO_ADI/` olur; `VITE_BASE_PATH` workflow’da repoadına göre ayarlanır. Kullanıcı sitesi (`KULLANICI.github.io` adlı repo) için taban yol otomatik `/` yapılır.

## Veri güncelleme

Ring ve saatleri değiştirmek için [`public/data/rings.json`](public/data/rings.json) dosyasını düzenleyip yeniden build edin. `eveningHourLocal`, hafta içi gündüz/akşam ayrımıdır (varsayılan 17).

## Harita katmanı

Varsayılan: **CARTO Voyager** (OSM verisi). Koşullar ve kota için [CARTO](https://carto.com/basemaps/) ve [OpenStreetMap telif](https://www.openstreetmap.org/copyright) sayfalarına bakın. Yoğun trafikte kendi tile proxy’niz veya farklı bir `TileLayer` URL’si gerekebilir; ayar `RingMap.tsx` içinde.
