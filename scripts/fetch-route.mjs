#!/usr/bin/env node
/**
 * OSRM public demo sunucusundan yol üzerinde polyline alır (lat, lng sırası).
 * Üretimde kota/limit vardır; yoğun kullanımda kendi OSRM kurulumunuzu kullanın.
 *
 * Kullanım:
 *   node scripts/fetch-route.mjs '[[39.9,32.78],[39.91,32.79]]'
 *   node scripts/fetch-route.mjs --file waypoints.json
 *
 * waypoints.json: { "coordinates": [[lat,lng], ...] } veya doğrudan [[lat,lng], ...]
 */

import fs from 'node:fs'

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

function parseCoords() {
  const args = process.argv.slice(2)
  if (args[0] === '--file') {
    const raw = JSON.parse(fs.readFileSync(args[1], 'utf8'))
    if (Array.isArray(raw)) return raw
    if (raw.coordinates) return raw.coordinates
    throw new Error('--file içinde coordinates dizisi veya kök dizi bekleniyor')
  }
  if (!args[0]) {
    console.error(
      'Örnek: node scripts/fetch-route.mjs \'[[39.897,32.782],[39.905,32.77]]\'',
    )
    process.exit(1)
  }
  return JSON.parse(args[0])
}

/** @param {[number, number][]} latLngPairs */
async function fetchPolylineFromOsrm(latLngPairs) {
  if (latLngPairs.length < 2) {
    throw new Error('En az 2 nokta gerekli')
  }
  const pathParam = latLngPairs.map(([lat, lng]) => `${lng},${lat}`).join(';')
  const url = `${OSRM_BASE}/${pathParam}?overview=full&geometries=geojson`
  const res = await fetch(url)
  const text = await res.text()
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}: ${text.slice(0, 200)}`)
  const data = JSON.parse(text)
  if (data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates) {
    throw new Error(`OSRM yanıtı: ${text.slice(0, 300)}`)
  }
  return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
}

const coords = parseCoords()
try {
  const poly = await fetchPolylineFromOsrm(coords)
  process.stdout.write(JSON.stringify(poly, null, 2) + '\n')
} catch (e) {
  console.error(e.message || e)
  process.exit(1)
}
