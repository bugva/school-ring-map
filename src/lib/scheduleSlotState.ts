import {
  serviceTimelineMinutesFromClock,
  serviceTimelineMinutesFromHHMM,
} from './serviceDay'

/** "HH:MM" → günün dakikası; geçersizse null */
export function parseScheduleMinutes(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) {
    return null
  }
  return h * 60 + min
}

export type ScheduleSlotVisual = 'neutral' | 'past' | 'current' | 'future' | 'next'

/** Sefer saatinden kaç dakika sonra "geçmiş" sayılacağı */
const PAST_AFTER_MINUTES = 1

/**
 * Bugünkü saate göre her sefer için görünüm.
 * current = kalkış saati ≤ şimdi ve henüz 1 dk geçmemiş; 1 dk geçince past olur.
 * next = tüm seferler gelecekteyken ilk sefer.
 */
export function scheduleSlotVisuals(
  times: string[],
  now: Date,
): ScheduleSlotVisual[] {
  const nowM = serviceTimelineMinutesFromClock(now)
  const minutes = times.map((t) => serviceTimelineMinutesFromHHMM(t))
  const n = times.length
  const out: ScheduleSlotVisual[] = times.map(() => 'neutral')

  const validIdx: number[] = []
  for (let i = 0; i < n; i++) {
    if (minutes[i] != null) validIdx.push(i)
  }
  if (!validIdx.length) return out

  let activeIdx = -1
  let bestT = -1
  for (const i of validIdx) {
    const t = minutes[i]!
    if (t <= nowM && t >= bestT) {
      bestT = t
      activeIdx = i
    }
  }

  if (activeIdx >= 0 && nowM >= bestT + PAST_AFTER_MINUTES) {
    const nextValidIdx = validIdx.find((i) => i > activeIdx)
    if (nextValidIdx != null) {
      for (let i = 0; i < n; i++) {
        const t = minutes[i]
        if (t == null) continue
        if (i < nextValidIdx) out[i] = 'past'
        else if (i === nextValidIdx) out[i] = 'next'
        else out[i] = 'future'
      }
      return out
    }
    for (const i of validIdx) out[i] = 'past'
    return out
  }

  if (activeIdx < 0) {
    let firstIdx = validIdx[0]!
    let firstM = minutes[firstIdx]!
    for (const i of validIdx) {
      const t = minutes[i]!
      if (t < firstM) {
        firstM = t
        firstIdx = i
      }
    }
    for (const i of validIdx) {
      out[i] = i === firstIdx ? 'next' : 'future'
    }
    return out
  }

  for (let i = 0; i < n; i++) {
    const t = minutes[i]
    if (t == null) continue
    if (i < activeIdx) out[i] = 'past'
    else if (i === activeIdx) out[i] = 'current'
    else out[i] = 'future'
  }
  return out
}
