import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { DayProfile, Ring, Stop } from '../types/rings'
import { buildShowAllSections } from '../lib/stopTimesShowAllSections'
import { scheduleTimeRowClass } from '../lib/scheduleTimeRowClass'
import { stopTimesForProfile } from '../lib/stopTimesForProfile'
import {
  scheduleSlotVisuals,
  type ScheduleSlotVisual,
} from '../lib/scheduleSlotState'
import {
  serviceTimelineMinutesFromClock,
  serviceTimelineMinutesFromHHMM,
} from '../lib/serviceDay'
import { stopSheetLineNotice } from '../lib/ringServiceStatus'

type Props = {
  ring: Ring
  stop: Stop
  activeProfile: DayProfile
  activeProfileLabel: string
  /** Geçmiş / şu an / gelecek vurgusu (harita saati) */
  scheduleNow?: Date
  onClose: () => void
}

function formatCountdown(diffMs: number): string {
  const totalSec = Math.max(0, Math.floor(diffMs / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h} sa ${m} dk`
  if (m > 0) return `${m} dk ${s} sn`
  return `${s} sn`
}

function computeCountdown(
  times: string[],
  now: Date,
): { label: string; diffMs: number } | null {
  const nowM = serviceTimelineMinutesFromClock(now)

  for (const t of times) {
    const tripM = serviceTimelineMinutesFromHHMM(t)
    if (tripM == null) continue
    if (tripM > nowM) {
      const diffMs = (tripM - nowM) * 60 * 1000
      return { label: formatCountdown(diffMs), diffMs }
    }
  }
  return null
}

function useCountdownToNext(
  times: string[],
  scheduleNow: Date | undefined,
): { label: string; diffMs: number } | null {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!scheduleNow) return
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [scheduleNow])

  if (!scheduleNow) return null
  return computeCountdown(times, now)
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
  const totalStops = ring.stops.length

  const refDate = scheduleNow ?? new Date()
  const activeTimes = stopTimesForProfile(stop.times, activeProfile, refDate)
  const countdown = useCountdownToNext(activeTimes, scheduleNow)
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

  const lineNotice = useMemo(
    () =>
      stopSheetLineNotice(
        ring,
        activeProfile,
        refDate,
        scheduleNow ?? refDate,
      ),
    [ring, activeProfile, refDate, scheduleNow],
  )

  const liveRowRef = useRef<HTMLLIElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const firstLiveIdx = useMemo(() => {
    for (let i = 0; i < activeVisuals.length; i++) {
      const v = activeVisuals[i]
      if (v === 'current' || v === 'next') return i
    }
    return -1
  }, [activeVisuals])

  const scrollToLive = useCallback(() => {
    const el = liveRowRef.current
    const body = bodyRef.current
    if (!el || !body) return
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }, [])

  useEffect(() => {
    if (firstLiveIdx >= 0) scrollToLive()
  }, [firstLiveIdx, scrollToLive])

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
        <div className="stop-sheet__sticky">
          <div className="stop-sheet__handle" aria-hidden />
          {lineNotice !== 'none' ? (
            <div
              className={`stop-sheet__line-notice ${lineNotice === 'not_running_today' ? 'stop-sheet__line-notice--inactive' : 'stop-sheet__line-notice--ended'}`}
              role="status"
            >
              <span className="stop-sheet__line-notice-icon" aria-hidden="true">
                {lineNotice === 'not_running_today' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                )}
              </span>
              <span className="stop-sheet__line-notice-text">
                {lineNotice === 'not_running_today' ? (
                  <>
                    <strong>Bugün sefer yapılmıyor</strong>
                    <span>Saatler yalnızca bilgi amaçlıdır</span>
                  </>
                ) : (
                  <>
                    <strong>Seferler sona erdi</strong>
                    <span>Geçmiş saatler listelenmektedir</span>
                  </>
                )}
              </span>
            </div>
          ) : null}
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
              <span className="stop-sheet__ring-name">{ring.name}</span>
              {stopOrder > 0 ? (
                <span className="stop-sheet__progress">
                  {stopOrder}/{totalStops}
                </span>
              ) : null}
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
          {countdown ? (
            <div className="stop-sheet__countdown">
              <span className="stop-sheet__countdown-label">Sonraki sefer</span>
              <span className="stop-sheet__countdown-value">{countdown.label}</span>
            </div>
          ) : null}
          {stopOrder > 0 ? (
            <div className="stop-sheet__progress-bar" aria-hidden>
              <div
                className="stop-sheet__progress-fill"
                style={{
                  '--progress': `${(stopOrder / totalStops) * 100}%`,
                  '--ring-color': ring.color,
                } as CSSProperties}
              />
            </div>
          ) : null}
        </div>

        <div className="stop-sheet__body" ref={bodyRef}>
          <h3 className="stop-sheet__profile-heading">{activeProfileLabel}</h3>

          <ul className="stop-sheet__times" aria-label="Tahmini geçiş saatleri">
            {activeTimes.length ? (
              activeTimes.map((t, i) => {
                const visual = activeVisuals[i] ?? 'neutral'
                const isLiveRow = i === firstLiveIdx
                return (
                  <li
                    key={`${t}-${i}`}
                    ref={isLiveRow ? liveRowRef : undefined}
                    className={[
                      'stop-sheet__time-row',
                      scheduleTimeRowClass(visual),
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span className="stop-sheet__time-idx" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="stop-sheet__time-value">{t}</span>
                  </li>
                )
              })
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
