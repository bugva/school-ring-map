import type { ScheduleSlotVisual } from './scheduleSlotState'

export function scheduleTimeRowClass(v: ScheduleSlotVisual): string {
  if (v === 'past') return 'stop-sheet__time-row--past'
  if (v === 'current' || v === 'next') return 'stop-sheet__time-row--live'
  if (v === 'future') return 'stop-sheet__time-row--future'
  return ''
}
