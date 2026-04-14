#!/usr/bin/env node
/**
 * public/data/rings.json içindeki her ring için OSRM ile polyline üretir (ayırma yok).
 * Ağ erişimi gerekir.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const ringsPath = path.join(root, 'public/data/rings.json')

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

async function fetchPolyline(stops) {
  const pairs = stops.map((s) => [s.lat, s.lng])
  if (pairs.length < 2) return []
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

function fallbackPolyline(stops) {
  return stops.map((s) => [s.lat, s.lng])
}

const raw = JSON.parse(fs.readFileSync(ringsPath, 'utf8'))
if (!raw.rings?.length) {
  console.error('rings.json: ring yok')
  process.exit(1)
}

for (const ring of raw.rings) {
  if (!ring.stops?.length) continue
  try {
    ring.polyline = await fetchPolyline(ring.stops)
    console.error(`${ring.id}: OSRM ${ring.polyline.length} nokta`)
  } catch (e) {
    console.error(`${ring.id}: OSRM hatası, düz çizgi:`, e.message)
    ring.polyline = fallbackPolyline(ring.stops)
  }
}

fs.writeFileSync(ringsPath, JSON.stringify(raw, null, 2) + '\n', 'utf8')
console.error('Yazıldı:', ringsPath)
