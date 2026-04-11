import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { MetroLine, Stop } from '../types/rings'
import {
  defaultMetroTabFromDate,
  groupTimesByHour,
  type MetroScheduleTab,
  timesForMetroTab,
} from '../lib/metroTimesGrid'

const TAB_LABELS: Record<MetroScheduleTab, string> = {
  weekday: 'Haftaiçi',
  saturday: 'Cumartesi',
  sunday: 'Pazar',
}

type Props = {
  metro: MetroLine
  scheduleNow?: Date
}

function MetroStopScheduleTable({
  stop,
  stopOrder,
  tab,
}: {
  stop: Stop
  stopOrder: number
  tab: MetroScheduleTab
}) {
  const rows = useMemo(() => {
    const flat = timesForMetroTab(stop, tab)
    return groupTimesByHour(flat)
  }, [stop, tab])

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
      <div
        className="metro-schedule"
        role="table"
        aria-label={`${stop.name} kalkış saatleri (${TAB_LABELS[tab]})`}
      >
        <div className="metro-schedule__head" role="row">
          <div className="metro-schedule__head-cell metro-schedule__head-cell--hour">
            Saat
          </div>
          <div className="metro-schedule__head-cell metro-schedule__head-cell--minutes">
            Dakika
          </div>
        </div>
        {rows.length ? (
          rows.map((row) => (
            <div className="metro-schedule__row" key={row.hour} role="row">
              <div className="metro-schedule__hour" role="cell">
                {row.hour}
              </div>
              <div className="metro-schedule__minutes" role="cell">
                {row.minutes.join(' ')}
              </div>
            </div>
          ))
        ) : (
          <p className="metro-schedule__empty" role="status">
            Bu gün tipi için kayıt yok.
          </p>
        )}
      </div>
    </div>
  )
}

export function MetroTimesPanel({ metro, scheduleNow }: Props) {
  const refDate = scheduleNow ?? new Date()
  const [tab, setTab] = useState<MetroScheduleTab>(() =>
    defaultMetroTabFromDate(refDate),
  )

  const style = {
    '--sheet-accent': metro.color,
  } as CSSProperties

  const tabIds = {
    weekday: 'metro-tab-weekday',
    saturday: 'metro-tab-saturday',
    sunday: 'metro-tab-sunday',
  } as const

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
          <p className="metro-times-panel__subtitle">
            Gün tipini seçin; tabloda saat ve dakikalar listelenir.
          </p>
        </div>
      </div>
      <div
        className="metro-times-panel__tabs"
        role="tablist"
        aria-label="Metro gün tipi"
      >
        {(Object.keys(TAB_LABELS) as MetroScheduleTab[]).map((key) => (
          <button
            key={key}
            type="button"
            id={tabIds[key]}
            role="tab"
            aria-selected={tab === key}
            tabIndex={tab === key ? 0 : -1}
            className={`metro-times-panel__tab${tab === key ? ' metro-times-panel__tab--selected' : ''}`}
            onClick={() => setTab(key)}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>
      <div
        className="metro-times-panel__scroll"
        role="tabpanel"
        aria-labelledby={tabIds[tab]}
      >
        {metro.stops.map((stop, idx) => (
          <MetroStopScheduleTable
            key={stop.id}
            stop={stop}
            stopOrder={idx + 1}
            tab={tab}
          />
        ))}
      </div>
    </section>
  )
}
