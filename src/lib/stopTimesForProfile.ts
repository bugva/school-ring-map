import type { DayProfile, Stop } from '../types/rings'

/** Aktif profile göre sefer listesi (Pazar → weekend_sunday). */
export function stopTimesForProfile(
  times: Stop['times'],
  profile: DayProfile,
  referenceDate: Date,
): string[] {
  if (profile === 'weekend') {
    if (referenceDate.getDay() === 0 && times.weekend_sunday?.length) {
      return times.weekend_sunday
    }
    return times.weekend
  }
  return times[profile] ?? []
}
