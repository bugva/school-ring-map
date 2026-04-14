#!/usr/bin/env node
/**
 * Sarı ring: belirli durak sırası + OSRM polyline.
 * Durak rings.json’da varsa (isim/saatlerle) klonlanır; yoksa stops-overview.csv konumu + boş times.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const ringsPath = path.join(root, 'public/data/rings.json')
const csvPath = path.join(root, 'public/data/stops-overview.csv')
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

/** Sarı segment (kırmızı ayrı ring olarak sonra eklenecek) */
const SARI_STOP_ORDER = [
  'a2-1',
  'garaj-1',
  'BOTE_MYO',
  'egitim_fak',
  'teknokent-1',
  'enformatik-1',
  'odtukent-1',
  'bati_yurtlar-1',
  'havacilik-1',
  'bati_yurtlar-2',
  'odtukent-2',
  'gida-1',
  'jeoloji-1',
  'makina-1',
  'endustri-1',
  'yuva-1',
  'mimarlik-1',
  'ydyo-1',
  'iibf-1',
  'kutuphane-1',
  'rektorluk-1',
  'ziraat-1',
  'dogu_yurtlar-1',
]

const EMPTY_TIMES = {
  weekday_day: [],
  weekday_evening: [],
  weekend: [],
}

function parseCsvMap() {
  const text = fs.readFileSync(csvPath, 'utf8')
  const map = new Map()
  for (const line of text.trim().split('\n').slice(1)) {
    if (!line.trim()) continue
    const [id, latS, lngS] = line.split(',')
    const lat = parseFloat(latS)
    const lng = parseFloat(lngS)
    if (id?.trim() && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      map.set(id.trim(), { lat, lng })
    }
  }
  return map
}

function findStop(data, id) {
  for (const ring of data.rings) {
    const s = ring.stops.find((x) => x.id === id)
    if (s) return structuredClone(s)
  }
  return null
}

function prettyName(id) {
  return id
    .replace(/_/g, ' ')
    .replace(/-(\d+)$/, ' ($1)')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

async function fetchPolyline(pairs) {
  const pathParam = pairs.map(([lat, lng]) => `${lng},${lat}`).join(';')
  const url = `${OSRM_BASE}/${pathParam}?overview=full&geometries=geojson`
  const res = await fetch(url)
  const text = await res.text()
  if (!res.ok) throw new Error(`OSRM ${res.status}: ${text.slice(0, 200)}`)
  const data = JSON.parse(text)
  if (data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates) {
    throw new Error(`OSRM: ${text.slice(0, 250)}`)
  }
  return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
}

const csvMap = parseCsvMap()
const raw = JSON.parse(fs.readFileSync(ringsPath, 'utf8'))

const stops = []
for (const id of SARI_STOP_ORDER) {
  const fromRing = findStop(raw, id)
  const csv = csvMap.get(id)
  if (!csv) {
    console.error('CSV’de yok:', id)
    process.exit(1)
  }
  if (fromRing) {
    fromRing.lat = csv.lat
    fromRing.lng = csv.lng
    stops.push(fromRing)
  } else {
    stops.push({
      id,
      name: prettyName(id),
      lat: csv.lat,
      lng: csv.lng,
      times: structuredClone(EMPTY_TIMES),
    })
  }
}

const pairs = stops.map((s) => [s.lat, s.lng])
let polyline
try {
  polyline = await fetchPolyline(pairs)
  console.error('Sarı ring OSRM nokta sayısı:', polyline.length)
} catch (e) {
  console.error('OSRM hatası, düz çizgi:', e.message)
  polyline = pairs
}

const sariRing = {
  id: 'sari',
  name: 'Sarı ring',
  color: '#ca8a04',
  polyline,
  stops,
}

const idx = raw.rings.findIndex((r) => r.id === 'sari')
if (idx >= 0) {
  raw.rings[idx] = sariRing
} else {
  raw.rings.unshift(sariRing)
}

fs.writeFileSync(ringsPath, JSON.stringify(raw, null, 2) + '\n', 'utf8')
console.error('Sarı ring yazıldı (liste başına):', ringsPath)
