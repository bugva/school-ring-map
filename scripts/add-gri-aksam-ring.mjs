/**
 * Gri rotasından "Gri akşam ring" kopyalar: hafta sonu 19:30–23:30 arası 60 dk ara.
 * Kullanım: node scripts/add-gri-aksam-ring.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const ringsPath = path.join(root, 'public/data/rings.json')

function parseHHMM(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s).trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

function formatHHMM(totalMin) {
  let t = totalMin
  while (t >= 24 * 60) t -= 24 * 60
  while (t < 0) t += 24 * 60
  const h = Math.floor(t / 60)
  const m = t % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const text = fs.readFileSync(ringsPath, 'utf8')
const data = JSON.parse(text)

const griIdx = data.rings.findIndex((r) => r.id === 'gri')
if (griIdx < 0) {
  console.error('gri ring bulunamadı')
  process.exit(1)
}
if (data.rings.some((r) => r.id === 'gri-aksam')) {
  console.error('gri-aksam zaten var')
  process.exit(1)
}

const gri = data.rings[griIdx]
const ref0 = parseHHMM(gri.stops[0].times.weekend[0])
if (ref0 == null) {
  console.error('gri ilk durak weekend saati okunamadı')
  process.exit(1)
}

/** 19:30 … 23:30 saatlik kalkışlar (dakika) */
const BASES = [19 * 60 + 30, 20 * 60 + 30, 21 * 60 + 30, 22 * 60 + 30, 23 * 60 + 30]

const aksam = structuredClone(gri)
aksam.id = 'gri-aksam'
aksam.name = 'Gri akşam ring'
aksam.color = '#475569'

for (const stop of aksam.stops) {
  const w = stop.times.weekend
  if (!w?.length) {
    console.error('Durakta weekend yok:', stop.id)
    process.exit(1)
  }
  const off = parseHHMM(w[0]) - ref0
  const weekend = BASES.map((b) => formatHHMM(b + off))
  stop.times = {
    weekday_day: [],
    weekday_evening: [],
    weekend,
    weekend_sunday: [...weekend],
  }
}

data.rings.splice(griIdx + 1, 0, aksam)
fs.writeFileSync(ringsPath, JSON.stringify(data, null, 2) + '\n')
console.log('OK: gri-aksam eklendi (5 sefer × durak, hafta sonu 60 dk).')
