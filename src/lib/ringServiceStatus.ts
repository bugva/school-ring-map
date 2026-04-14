import type { DayProfile, MetroLine, Ring } from '../types/rings'
import type { DayProfileInfo } from './dayProfile'
import { defaultMetroTabFromDate, timesForMetroTab } from './metroTimesGrid'
import { stopTimesForProfile } from './stopTimesForProfile'
import {
  serviceTimelineMinutesFromClock,
  serviceTimelineMinutesFromHHMM,
} from './serviceDay'

/** Sefer saatinden kaç dakika sonra hat “bitmiş” sayılır (`scheduleSlotState` ile uyumlu) */
const PAST_AFTER_MINUTES = 1

export type RingPickerBucket =
  | 'off_schedule'
  | 'active'
  | 'finished'
  | 'gray_weekday'

const BUCKET_SORT: Record<RingPickerBucket, number> = {
  off_schedule: 0,
  active: 1,
  finished: 2,
  gray_weekday: 3,
}

/** Gri gündüz + Gri akşam aynı hafta sonu kuralı */
export function isGriFamily(ringId: string): boolean {
  return ringId === 'gri' || ringId === 'gri-aksam'
}

export function ringRunsOnProfile(ring: Ring, profile: DayProfile): boolean {
  if (isGriFamily(ring.id)) return profile === 'weekend'
  return profile !== 'weekend'
}

function iterProfileTimes(ring: Ring, profile: DayProfile, refDate: Date): number[] {
  const mins: number[] = []
  for (const stop of ring.stops) {
    for (const t of stopTimesForProfile(stop.times, profile, refDate)) {
      const m = serviceTimelineMinutesFromHHMM(t)
      if (m != null) mins.push(m)
    }
  }
  return mins
}

export function ringHasScheduleForProfile(
  ring: Ring,
  profile: DayProfile,
  refDate: Date,
): boolean {
  return iterProfileTimes(ring, profile, refDate).length > 0
}

/** Hat için hâlâ “yakalanabilir” veya 1 dk toleranslı son sefer var mı */
export function ringHasServiceLeft(
  ring: Ring,
  profile: DayProfile,
  refDate: Date,
  now: Date,
): boolean {
  const nowM = serviceTimelineMinutesFromClock(now)
  for (const stop of ring.stops) {
    for (const t of stopTimesForProfile(stop.times, profile, refDate)) {
      const tm = serviceTimelineMinutesFromHHMM(t)
      if (tm == null) continue
      if (nowM < tm + PAST_AFTER_MINUTES) return true
    }
  }
  return false
}

export function ringPickerBucket(
  ring: Ring,
  dayInfo: DayProfileInfo,
  refDate: Date,
  now: Date,
): RingPickerBucket {
  const { profile } = dayInfo
  if (isGriFamily(ring.id) && profile !== 'weekend') return 'gray_weekday'
  if (!ringRunsOnProfile(ring, profile)) return 'off_schedule'
  if (!ringHasScheduleForProfile(ring, profile, refDate)) {
    return 'off_schedule'
  }
  if (ringHasServiceLeft(ring, profile, refDate, now)) return 'active'
  return 'finished'
}

export function sortRingsForPicker(
  rings: Ring[],
  dayInfo: DayProfileInfo,
  refDate: Date,
  now: Date,
): Ring[] {
  const decorated = rings.map((ring, index) => ({
    ring,
    index,
    bucket: ringPickerBucket(ring, dayInfo, refDate, now),
  }))
  decorated.sort((a, b) => {
    const da = BUCKET_SORT[a.bucket]
    const db = BUCKET_SORT[b.bucket]
    if (da !== db) return da - db
    return a.index - b.index
  })
  return decorated.map((d) => d.ring)
}

export type StopSheetLineNotice = 'none' | 'not_running_today' | 'ended_for_today'

export function stopSheetLineNotice(
  ring: Ring,
  profile: DayProfile,
  refDate: Date,
  now: Date,
): StopSheetLineNotice {
  if (!ringRunsOnProfile(ring, profile)) return 'not_running_today'
  if (!ringHasScheduleForProfile(ring, profile, refDate)) {
    return 'not_running_today'
  }
  if (!ringHasServiceLeft(ring, profile, refDate, now)) return 'ended_for_today'
  return 'none'
}

function metroHasScheduleForTab(metro: MetroLine, tab: ReturnType<typeof defaultMetroTabFromDate>): boolean {
  for (const stop of metro.stops) {
    if (timesForMetroTab(stop, tab).length) return true
  }
  return false
}

function metroHasServiceLeft(metro: MetroLine, now: Date): boolean {
  const tab = defaultMetroTabFromDate(now)
  if (!metroHasScheduleForTab(metro, tab)) return false
  const nowM = serviceTimelineMinutesFromClock(now)
  for (const stop of metro.stops) {
    for (const t of timesForMetroTab(stop, tab)) {
      const tm = serviceTimelineMinutesFromHHMM(t)
      if (tm == null) continue
      if (nowM < tm + PAST_AFTER_MINUTES) return true
    }
  }
  return false
}

/** Metro yalnızca hafta içi gösterildiğinde picker’da soluk / canlı ayrımı için */
export function metroPickerLowFocus(
  metro: MetroLine,
  dayInfo: DayProfileInfo,
  now: Date,
): boolean {
  if (dayInfo.profile === 'weekend') return true
  return !metroHasServiceLeft(metro, now)
}
