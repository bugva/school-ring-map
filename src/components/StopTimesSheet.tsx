import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { DayProfile, Ring, Stop } from '../types/rings'
import { buildShowAllSections } from '../lib/stopTimesShowAllSections'
import { scheduleTimeRowClass } from '../lib/scheduleTimeRowClass'
import { stopTimesForProfile } from '../lib/stopTimesForProfile'
import {
  scheduleSlotVisuals,
  type ScheduleSlotVisual,
} from '../lib/scheduleSlotState'

type Props = {
  ring: Ring
  stop: Stop
  activeProfile: DayProfile
  activeProfileLabel: string
  /** Geçmiş / şu an / gelecek vurgusu (harita saati) */
  scheduleNow?: Date
  onClose: () => void
}

export function StopTimesSheet({
  ring,
  stop,
  activeProfile,
  activeProfileLabel,
  scheduleNow,
  onClose,
}: Props) {
  const [showAll, setShowAll] = useState(false)

  const stopOrder =
    ring.stops.findIndex((s) => s.id === stop.id) + 1

  const refDate = scheduleNow ?? new Date()
  const activeTimes = stopTimesForProfile(stop.times, activeProfile, refDate)
  const showAllSections = useMemo(
    () => buildShowAllSections(stop, activeProfile, refDate),
    [stop, activeProfile, refDate],
  )

  const activeVisuals = useMemo(
    () =>
      scheduleNow
        ? scheduleSlotVisuals(activeTimes, scheduleNow)
        : activeTimes.map(() => 'neutral' as ScheduleSlotVisual),
    [activeTimes, scheduleNow],
  )

  const sheetStyle = {
    '--sheet-accent': ring.color,
  } as CSSProperties

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        className="stop-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stop-sheet-title"
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="stop-sheet__handle" aria-hidden />
        <header className="stop-sheet__head">
          <h2 id="stop-sheet-title" className="stop-sheet__title">
            {stopOrder > 0 ? (
              <>
                <span className="stop-sheet__stop-order">{stopOrder}.</span>{' '}
                {stop.name}
              </>
            ) : (
              stop.name
            )}
          </h2>
          <p className="stop-sheet__meta">
            <span
              className="stop-sheet__ring-badge"
              style={{ backgroundColor: ring.color }}
            />
            {ring.name}
          </p>
          <button
            type="button"
            className="stop-sheet__close"
            onClick={onClose}
            aria-label="Kapat"
          >
            Kapat
          </button>
        </header>

        <div className="stop-sheet__body">
          <h3 className="stop-sheet__profile-heading">{activeProfileLabel}</h3>

          <ul className="stop-sheet__times" aria-label="Tahmini geçiş saatleri">
            {activeTimes.length ? (
              activeTimes.map((t, i) => (
                <li
                  key={`${t}-${i}`}
                  className={[
                    'stop-sheet__time-row',
                    scheduleTimeRowClass(activeVisuals[i] ?? 'neutral'),
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="stop-sheet__time-idx" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="stop-sheet__time-value">{t}</span>
                </li>
              ))
            ) : (
              <li className="stop-sheet__empty">Bu dilimde kayıt yok.</li>
            )}
          </ul>

          <button
            type="button"
            className="stop-sheet__toggle"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
          >
            {showAll ? 'Diğer dilimleri gizle' : 'Tüm dilimleri göster'}
          </button>

          {showAll ? (
            <div className="stop-sheet__all">
              {showAllSections.map((sec) => {
                const blockTimes = sec.times
                const blockVisuals = scheduleNow
                  ? scheduleSlotVisuals(blockTimes, scheduleNow)
                  : blockTimes.map(() => 'neutral' as ScheduleSlotVisual)
                return (
                  <div key={sec.key} className="stop-sheet__block">
                    <h3 className="stop-sheet__block-title">{sec.title}</h3>
                    <ul className="stop-sheet__times stop-sheet__times--compact">
                      {blockTimes.length ? (
                        blockTimes.map((t, i) => (
                          <li
                            key={`${sec.key}-${t}-${i}`}
                            className={[
                              'stop-sheet__time-row',
                              scheduleTimeRowClass(blockVisuals[i] ?? 'neutral'),
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            <span className="stop-sheet__time-idx" aria-hidden="true">
                              {i + 1}
                            </span>
                            <span className="stop-sheet__time-value">{t}</span>
                          </li>
                        ))
                      ) : (
                        <li className="stop-sheet__empty stop-sheet__empty--inline">
                          —
                        </li>
                      )}
                    </ul>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
