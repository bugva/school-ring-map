# Okul ring haritası

Mobil uyumlu harita: ring seçimi, OpenStreetMap üzerinde renkli hat ve duraklar; durakta tahmini geçiş saatleri (hafta içi gündüz/akşam ve hafta sonu).

## Geliştirme

```bash
npm install
npm run dev
```

## Veri

Ringler ve saatler: [`public/data/rings.json`](public/data/rings.json). `eveningHourLocal` hafta içi akşam başlangıç saatidir.

Her ring için `polyline`, haritada **yol üzerinden** gösterilen hatır; `stops` ile aynı listede olmak zorunda değildir (rotayı durak sırasına göre düzenlemek sizin veri disiplininize bağlı).

### Otobüs hattını OSRM ile üretmek

- **Tek rota (çıktıyı elle `rings.json`a yapıştırın):**

  ```bash
  npm run routes:fetch -- '[[39.897,32.782],[39.905,32.77]]'
  ```

  veya `waypoints.json` içinde `[[lat,lng], ...]` veya `{ "coordinates": [...] }` ile:

  ```bash
  npm run routes:fetch -- --file waypoints.json
  ```

- **Mevcut tek ringdeki durakları ikiye bölüp her ring için ayrı hat (Yeşil / Mavi):** ağ gerekir, [`scripts/update-rings-split-osrm.mjs`](scripts/update-rings-split-osrm.mjs) dosyası `public/data/rings.json` dosyasını günceller.

  ```bash
  npm run routes:split-osrm
  ```

- **Kahverengi ring** (sabit durak sırası + OSRM): [`scripts/add-brown-ring.mjs`](scripts/add-brown-ring.mjs)

  ```bash
  npm run routes:add-kahve
  ```

  Haritada hatlar, **yön okları** ile gösterilir (`RingPolylineWithArrows`).

  Durak sırası gerçek ring güzergâhınız değilse, önce `rings.json` içinde durakları doğru sıraya koyun veya ringleri elle iki obje olarak ayırıp `npm run routes:fetch` ile her biri için polyline üretin.

Kullanılan servis: [OSRM](https://router.project-osrm.org/) demo sunucusu — yoğun/kurumsal kullanımda kota ve kullanım koşullarına dikkat edin; gerekirse kendi OSRM kurulumunuzu kullanın.

## Excel’den saat aktarma (`ring saatleri .xlsx`)

[`scripts/merge-excel-times.py`](scripts/merge-excel-times.py) dosyası, `Sayfa1` üzerinde:

- **`mor`** satırları → **`mavi`** ring: `Stop` sütunu **1–28**, `rings.json` içindeki **mavi ring’in ilk 28 durağının sırası** ile eşleşir (Excel’deki 1 = birinci durak, …).
- **`kahve`** satırları → **`kahve`** ring: `Stop` **1–12**, [kahverengi güzergâh sırası](scripts/add-brown-ring.mjs) ile aynı (A1(1) … A1(2)).

Saatler **05:00–16:59** → `weekday_day`, **17:00–23:59** ve **00:00–04:59** → `weekday_evening`. `weekend`, bu iki listenin birleşimi (Excel’de hafta sonu ayrımı yok).

```bash
pip3 install openpyxl   # bir kez
npm run times:merge -- "/path/to/ring saatleri .xlsx"
```

Argüman verilmezse varsayılan: `~/Desktop/ring saatleri .xlsx`.

## Durak ekleme aracı (geçici)

`npm run dev` ile çalışırken üstte **Durak ekleme modu** çıkar. Açıp haritaya tıklayın, `id` (ve isteğe bağlı ad) girin; taslaklar turuncu işaretle görünür. **JSON kopyala** çıktısını `rings.json` içindeki `stops` listesine yapıştırabilirsiniz; **CSV kopyala** sizin kullandığınız `stop_id,stop_lat,stop_lon` formatındadır.

Üretim build'inde varsayılan olarak kapalıdır. Gerekirse `VITE_STOP_EDITOR=true` (bkz. [`.env.example`](.env.example)) veya adres çubuğuna `?stopEditor=1` ekleyin.

Aracı tamamen kapatmak için [`src/lib/stopEditorEnv.ts`](src/lib/stopEditorEnv.ts) dosyasında `isStopEditorEnabled` sürekli `false` dönecek şekilde düzenleyin.

## Yayınlama

Bkz. [DEPLOY.md](DEPLOY.md).
