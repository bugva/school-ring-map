/**
 * Hizmet günü yerel saatte 04:00'te biter.
 * 00:00–03:59 arası hâlâ bir önceki takvim gününün programı ve gün tipi sayılır.
 */
export const SERVICE_DAY_ROLLOVER_HOUR = 4

/** Takvim günü ile sefer gününün eşleştiği tarih (yerel, saat 12:00). */
export function getServiceAnchorDate(now: Date): Date {
  const y = now.getFullYear()
  const mo = now.getMonth()
  const d = now.getDate()
  const anchor = new Date(y, mo, d, 12, 0, 0, 0)
  if (now.getHours() < SERVICE_DAY_ROLLOVER_HOUR) {
    anchor.setDate(anchor.getDate() - 1)
  }
  return anchor
}

/**
 * Gece yarısından sonra ama 04:00'ten önceki saatler, aynı hizmet günündeki
 * gece seferleriyle kıyaslanabilsin diye dakika eksenine +24h eklenir.
 */
export function serviceTimelineMinutesFromClock(now: Date): number {
  const h = now.getHours()
  const m = now.getMinutes()
  const s = now.getSeconds()
  const ms = now.getMilliseconds()
  const raw = h * 60 + m + s / 60 + ms / 60_000
  return raw < SERVICE_DAY_ROLLOVER_HOUR * 60 ? raw + 24 * 60 : raw
}

/** "HH:MM" → hizmet zaman çizgisinde dakika; geçersizse null */
export function serviceTimelineMinutesFromHHMM(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) {
    return null
  }
  const raw = h * 60 + min
  return raw < SERVICE_DAY_ROLLOVER_HOUR * 60 ? raw + 24 * 60 : raw
}
