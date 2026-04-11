import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { DayProfile, MetroLine, Stop } from '../types/rings'
import { buildShowAllSections } from '../lib/stopTimesShowAllSections'
import { scheduleTimeRowClass } from '../lib/scheduleTimeRowClass'
import { stopTimesForProfile } from '../lib/stopTimesForProfile'
import {
  scheduleSlotVisuals,
  type ScheduleSlotVisual,
} from '../lib/scheduleSlotState'

type Props = {
  metro: MetroLine
  activeProfile: DayProfile
  activeProfileLabel: string
  scheduleNow?: Date
}

function StopBlock({
  stop,
  stopOrder,
  activeProfile,
  activeProfileLabel,
  scheduleNow,
}: {
  stop: Stop
  stopOrder: number
  activeProfile: DayProfile
  activeProfileLabel: string
  scheduleNow?: Date
}) {
  const [showAll, setShowAll] = useState(false)
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

  return (
    <div className="metro-times-panel__stop">
      <h3 className="metro-times-panel__stop-name">
        {stopOrder > 0 ? (
          <>
            <span className="metro-times-panel__stop-order">{stopOrder}.</span>{' '}
            {stop.name}
          </>
        ) : (
          stop.name
        )}
      </h3>
      <p className="metro-times-panel__stop-context">{activeProfileLabel}</p>
      <ul
        className="stop-sheet__times"
        aria-label={`${stop.name} tahmini geçiş saatleri`}
      >
        {activeTimes.length ? (
          activeTimes.map((t, i) => (
            <li
              key={`${stop.id}-${t}-${i}`}
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
        className="stop-sheet__toggle metro-times-panel__toggle"
        onClick={() => setShowAll((v) => !v)}
        aria-expanded={showAll}
      >
        {showAll ? 'Diğer dilimleri gizle' : 'Tüm dilimleri göster'}
      </button>
      {showAll ? (
        <div className="stop-sheet__all metro-times-panel__all">
          {showAllSections.map((sec) => {
            const blockTimes = sec.times
            const blockVisuals = scheduleNow
              ? scheduleSlotVisuals(blockTimes, scheduleNow)
              : blockTimes.map(() => 'neutral' as ScheduleSlotVisual)
            return (
              <div key={`${stop.id}-${sec.key}`} className="stop-sheet__block">
                <h4 className="stop-sheet__block-title">{sec.title}</h4>
                <ul className="stop-sheet__times stop-sheet__times--compact">
                  {blockTimes.length ? (
                    blockTimes.map((t, i) => (
                      <li
                        key={`${stop.id}-${sec.key}-${t}-${i}`}
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
  )
}

export function MetroTimesPanel({
  metro,
  activeProfile,
  activeProfileLabel,
  scheduleNow,
}: Props) {
  const style = {
    '--sheet-accent': metro.color,
  } as CSSProperties

  return (
    <section
      className="metro-times-panel"
      style={style}
      aria-label={`${metro.name} sefer saatleri`}
    >
      <div className="metro-times-panel__head">
        <span
          className="metro-times-panel__line-badge"
          style={{ backgroundColor: metro.color }}
          aria-hidden
        />
        <div>
          <h2 className="metro-times-panel__title">{metro.name}</h2>
          <p className="metro-times-panel__subtitle">{activeProfileLabel}</p>
        </div>
      </div>
      <div className="metro-times-panel__scroll">
        {metro.stops.map((stop, idx) => (
          <StopBlock
            key={stop.id}
            stop={stop}
            stopOrder={idx + 1}
            activeProfile={activeProfile}
            activeProfileLabel={activeProfileLabel}
            scheduleNow={scheduleNow}
          />
        ))}
      </div>
    </section>
  )
}
