#!/usr/bin/env node
/**
 * Gri gündüz ring: durak sırası + OSRM polyline.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const ringsPath = path.join(root, 'public/data/rings.json')
const csvPath = path.join(root, 'public/data/stops-overview.csv')
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

const GRI_GUNDUZ_STOP_ORDER = [
  'a2-1',
  'garaj-1',
  'muze-1',
  'egitim-1',
  'teknokent-1',
  'enformatik-1',
  'odtukent-1',
  'bati_yurtlar-1',
  'havacilik-1',
  'bati_yurtlar-2',
  'odtukent-2',
  'enformatik-2',
  'teknokent-2',
  'iibf-1',
  'rektorluk-1',
  'ziraat-1',
  'dogu_yurtlar-1',
  'isbank-1',
  'kkm-1',
  'rektorluk-2',
  'iibf-2',
  'a1-1',
  'iibf-3',
  'rektorluk-3',
  'insaat-2',
  'kimya-2',
  'jeoloji-2',
  'gida-2',
  'odtukent-3',
  'bati_yurtlar-3',
  'havacilik-2',
  'bati_yurtlar-4',
  'odtukent-4',
  'enformatik-3',
  'teknokent-3',
  'egitim_2-1',
  'muze-2',
  'garaj-2',
  'a2-2',
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

/** Yeni id’ler: mevcut duraktan şablon (saat / isim) */
function resolveStopTemplate(data, id) {
  if (id === 'egitim-1') {
    const s = findStop(data, 'egitim_fak')
    if (s) {
      const c = structuredClone(s)
      c.id = 'egitim-1'
      c.name = 'Eğitim (1)'
      return c
    }
  }
  if (id === 'muze-1') {
    const s = findStop(data, 'muze-2')
    if (s) {
      const c = structuredClone(s)
      c.id = 'muze-1'
      c.name = 'Muze (1)'
      return c
    }
  }
  return findStop(data, id)
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
for (const id of GRI_GUNDUZ_STOP_ORDER) {
  let fromRing = resolveStopTemplate(raw, id)
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
  console.error('Gri gündüz ring OSRM nokta sayısı:', polyline.length)
} catch (e) {
  console.error('OSRM hatası, düz çizgi:', e.message)
  polyline = pairs
}

const griRing = {
  id: 'gri',
  name: 'Gri gündüz ring',
  color: '#64748b',
  polyline,
  stops,
}

const existing = raw.rings.findIndex((r) => r.id === 'gri')
if (existing >= 0) {
  raw.rings.splice(existing, 1)
}

raw.rings.push(griRing)
fs.writeFileSync(ringsPath, JSON.stringify(raw, null, 2) + '\n', 'utf8')
console.error('Gri gündüz ring yazıldı:', ringsPath)
