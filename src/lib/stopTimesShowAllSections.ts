import type { DayProfile, Stop } from '../types/rings'
import { dayProfileLabel } from './dayProfile'

export type StopTimesExtraSection = {
  key: string
  title: string
  times: string[]
}

export function buildShowAllSections(
  stop: Stop,
  activeProfile: DayProfile,
  ref: Date,
): StopTimesExtraSection[] {
  const out: StopTimesExtraSection[] = []
  const sun = stop.times.weekend_sunday

  if (activeProfile !== 'weekday_day') {
    out.push({
      key: 'weekday_day',
      title: dayProfileLabel('weekday_day'),
      times: stop.times.weekday_day ?? [],
    })
  }
  if (activeProfile !== 'weekday_evening') {
    out.push({
      key: 'weekday_evening',
      title: dayProfileLabel('weekday_evening'),
      times: stop.times.weekday_evening ?? [],
    })
  }

  if (activeProfile !== 'weekend') {
    out.push({
      key: 'weekend_sat',
      title: 'Cumartesi',
      times: stop.times.weekend ?? [],
    })
    if (sun?.length) {
      out.push({ key: 'weekend_sun', title: 'Pazar', times: sun })
    }
    return out
  }

  const dow = ref.getDay()
  if (dow === 6 && sun?.length) {
    out.push({ key: 'weekend_sun', title: 'Pazar', times: sun })
  }
  if (dow === 0) {
    out.push({
      key: 'weekend_sat',
      title: 'Cumartesi',
      times: stop.times.weekend ?? [],
    })
  }
  return out
}
