import type { Stop } from '../types/rings'
import { getServiceAnchorDate } from './serviceDay'

export type MetroScheduleTab = 'weekday' | 'saturday' | 'sunday'

export function defaultMetroTabFromDate(date: Date): MetroScheduleTab {
  const d = getServiceAnchorDate(date).getDay()
  if (d === 0) return 'sunday'
  if (d === 6) return 'saturday'
  return 'weekday'
}

function parseToMinutesSinceMidnight(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
  if (!m) return null
  const h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

function formatHHMM(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Aynı saat dilimindeki çiftleri tekilleştirip kronolojik sıralar. */
export function mergeSortUniqueTimes(...lists: string[][]): string[] {
  const set = new Set<number>()
  for (const list of lists) {
    for (const t of list) {
      const n = parseToMinutesSinceMidnight(t)
      if (n !== null) set.add(n)
    }
  }
  return [...set].sort((a, b) => a - b).map(formatHHMM)
}

export function timesForMetroTab(stop: Stop, tab: MetroScheduleTab): string[] {
  switch (tab) {
    case 'weekday':
      return mergeSortUniqueTimes(
        stop.times.weekday_day ?? [],
        stop.times.weekday_evening ?? [],
      )
    case 'saturday':
      return mergeSortUniqueTimes(stop.times.weekend ?? [])
    case 'sunday':
      return mergeSortUniqueTimes(
        stop.times.weekend_sunday?.length
          ? stop.times.weekend_sunday
          : stop.times.weekend ?? [],
      )
    default:
      return []
  }
}

export type MetroHourRow = {
  hour: string
  minutes: string[]
}

/** Saat sütunu + dakika listesi (satır içi kaydırma için dakikalar ayrı string). */
export function groupTimesByHour(sortedHHMM: string[]): MetroHourRow[] {
  const byHour = new Map<number, string[]>()
  for (const t of sortedHHMM) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim())
    if (!m) continue
    const h = parseInt(m[1], 10)
    const min = m[2]
    if (!byHour.has(h)) byHour.set(h, [])
    byHour.get(h)!.push(min)
  }
  const hours = [...byHour.keys()].sort((a, b) => a - b)
  return hours.map((h) => {
    const mins = byHour.get(h)!
    mins.sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    return { hour: String(h).padStart(2, '0'), minutes: mins }
  })
}
