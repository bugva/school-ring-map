import type { DayProfile } from '../types/rings'
import { getServiceAnchorDate } from './serviceDay'

export type DayProfileInfo = {
  profile: DayProfile
  label: string
}

const LABELS: Record<DayProfile, string> = {
  weekend: 'Hafta sonu',
  weekday_day: 'Hafta içi (gündüz)',
  weekday_evening: 'Hafta içi (akşam)',
}

/**
 * Cihazın yerel saatine göre gün tipi.
 * 04:00'e kadar bir önceki takvim gününün hafta içi / hafta sonu tipi kullanılır.
 * Akşam dilimi: gece 00:00–03:59 saatleri bir önceki günün akşamı sayılır (saat +24).
 * @param eveningHourLocal Hafta içi gündüz/akşam ayrımı (varsayılan JSON’dan gelir).
 */
export function getDayProfile(
  date: Date = new Date(),
  eveningHourLocal: number,
): DayProfileInfo {
  const anchor = getServiceAnchorDate(date)
  const day = anchor.getDay()
  const isWeekend = day === 0 || day === 6

  if (isWeekend) {
    return {
      profile: 'weekend',
      label: day === 0 ? 'Pazar' : 'Cumartesi',
    }
  }

  const hour = date.getHours()
  const hourForSplit = hour < 4 ? hour + 24 : hour
  if (hourForSplit >= eveningHourLocal) {
    return { profile: 'weekday_evening', label: LABELS.weekday_evening }
  }

  return { profile: 'weekday_day', label: LABELS.weekday_day }
}

export function dayProfileLabel(profile: DayProfile): string {
  return LABELS[profile]
}
