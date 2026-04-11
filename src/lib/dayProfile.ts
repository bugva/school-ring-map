import type { DayProfile } from '../types/rings'

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
 * @param eveningHourLocal Hafta içi gündüz/akşam ayrımı (varsayılan JSON’dan gelir).
 */
export function getDayProfile(
  date: Date = new Date(),
  eveningHourLocal: number,
): DayProfileInfo {
  const day = date.getDay()
  const isWeekend = day === 0 || day === 6

  if (isWeekend) {
    return {
      profile: 'weekend',
      label: day === 0 ? 'Pazar' : 'Cumartesi',
    }
  }

  const hour = date.getHours()
  if (hour >= eveningHourLocal) {
    return { profile: 'weekday_evening', label: LABELS.weekday_evening }
  }

  return { profile: 'weekday_day', label: LABELS.weekday_day }
}

export function dayProfileLabel(profile: DayProfile): string {
  return LABELS[profile]
}
