#!/usr/bin/env node
/**
 * Kahverengi ring: belirli durak sırası + OSRM polyline, rings.json'a ekler.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ringsPath = path.join(__dirname, '../public/data/rings.json')
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

const STOP_ORDER = [
  'a1-1',
  'iibf-2',
  'rektorluk-2',
  'kkm-2',
  'insaat-1',
  'kimya-2',
  'makina-2',
  'endustri-2',
  'yuva-1',
  'mimarlik-1',
  'ydyo yeni',
  'a1-2',
]

function findStop(data, id) {
  for (const ring of data.rings) {
    const s = ring.stops.find((x) => x.id === id)
    if (s) return structuredClone(s)
  }
  return null
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

const raw = JSON.parse(fs.readFileSync(ringsPath, 'utf8'))
const stops = []
for (const id of STOP_ORDER) {
  const s = findStop(raw, id)
  if (!s) {
    console.error('Durak bulunamadı:', id)
    process.exit(1)
  }
  stops.push(s)
}

const pairs = stops.map((s) => [s.lat, s.lng])
let polyline
try {
  polyline = await fetchPolyline(pairs)
  console.error('OSRM nokta sayısı:', polyline.length)
} catch (e) {
  console.error('OSRM hatası, düz çizgi kullanılıyor:', e.message)
  polyline = pairs
}

const brownRing = {
  id: 'kahve',
  name: 'Kahverengi ring',
  color: '#78350f',
  polyline,
  stops,
}

const exists = raw.rings.findIndex((r) => r.id === 'kahve')
if (exists >= 0) {
  raw.rings[exists] = brownRing
} else {
  raw.rings.push(brownRing)
}

fs.writeFileSync(ringsPath, JSON.stringify(raw, null, 2) + '\n', 'utf8')
console.error('Kahverengi ring yazıldı:', ringsPath)
