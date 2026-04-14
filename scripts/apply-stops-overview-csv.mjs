#!/usr/bin/env node
/**
 * public/data/stops-overview.csv → rings.json içindeki eşleşen stop_id lat/lng güncellenir.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const csvPath = path.join(root, 'public/data/stops-overview.csv')
const ringsPath = path.join(root, 'public/data/rings.json')

const csv = fs.readFileSync(csvPath, 'utf8')
const map = new Map()
for (const line of csv.trim().split('\n').slice(1)) {
  if (!line.trim()) continue
  const parts = line.split(',')
  const id = parts[0]?.trim()
  const lat = parseFloat(parts[1])
  const lng = parseFloat(parts[2])
  if (!id || Number.isNaN(lat) || Number.isNaN(lng)) {
    console.warn('Atlandı:', line)
    continue
  }
  map.set(id, { lat, lng })
}

const data = JSON.parse(fs.readFileSync(ringsPath, 'utf8'))
let updated = 0
let missing = []
for (const ring of data.rings) {
  for (const s of ring.stops) {
    const u = map.get(s.id)
    if (u) {
      s.lat = u.lat
      s.lng = u.lng
      updated++
    }
  }
}
for (const id of map.keys()) {
  let found = false
  for (const ring of data.rings) {
    if (ring.stops.some((s) => s.id === id)) {
      found = true
      break
    }
  }
  if (!found) missing.push(id)
}

fs.writeFileSync(ringsPath, JSON.stringify(data, null, 2) + '\n', 'utf8')
console.error('Güncellenen durak:', updated)
if (missing.length) console.error('CSV’de var, rings.json’da yok:', missing.join(', '))
console.error('Yazıldı:', ringsPath)
