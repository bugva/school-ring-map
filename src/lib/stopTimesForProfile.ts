import type { DayProfile, Stop } from '../types/rings'
import { getServiceAnchorDate } from './serviceDay'

/** Aktif profile göre sefer listesi (Pazar → weekend_sunday). */
export function stopTimesForProfile(
  times: Stop['times'],
  profile: DayProfile,
  referenceDate: Date,
): string[] {
  if (profile === 'weekend') {
    const anchor = getServiceAnchorDate(referenceDate)
    if (anchor.getDay() === 0 && times.weekend_sunday?.length) {
      return times.weekend_sunday
    }
    return times.weekend
  }
  return times[profile] ?? []
}
