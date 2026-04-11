import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Ring } from '../types/rings'
import { METRO_VIEW_ID } from '../lib/mapView'

type Props = {
  rings: Ring[]
  hasMetro: boolean
  selectedId: string | null
  onSelect: (id: string) => void
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

export function RingPicker({
  rings,
  hasMetro,
  selectedId,
  onSelect,
}: Props) {
  const metroSelected = selectedId === METRO_VIEW_ID
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 10_000)
    return () => window.clearInterval(id)
  }, [])

  const selectedRing = rings.find((r) => r.id === selectedId)
  const accentColor =
    selectedId === METRO_VIEW_ID
      ? '#0e7490'
      : selectedRing?.color ?? 'transparent'

  return (
    <header className="ring-picker" role="navigation" aria-label="Ring seçimi">
      <div className="ring-picker__top">
        <p className="ring-picker__label">Ring hatları</p>
        <time className="ring-picker__clock" dateTime={now.toISOString()}>
          {formatClock(now)}
        </time>
      </div>
      <div className="ring-picker__chips" role="listbox" aria-label="Ring listesi">
        {hasMetro ? (
          <button
            type="button"
            role="option"
            aria-selected={metroSelected}
            className={`ring-picker__chip${metroSelected ? ' ring-picker__chip--selected' : ''}`}
            style={{ '--ring-color': '#0e7490' } as CSSProperties}
            onClick={() => onSelect(METRO_VIEW_ID)}
          >
            <span className="ring-picker__swatch ring-picker__swatch--metro" aria-hidden />
            <span className="ring-picker__chip-label">Metro</span>
          </button>
        ) : null}
        {rings.map((ring) => {
          const selected = ring.id === selectedId
          return (
            <button
              key={ring.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={`ring-picker__chip${selected ? ' ring-picker__chip--selected' : ''}`}
              style={{ '--ring-color': ring.color } as CSSProperties}
              onClick={() => onSelect(ring.id)}
            >
              <span
                className="ring-picker__swatch"
                aria-hidden
                style={{ backgroundColor: ring.color }}
              />
              <span className="ring-picker__chip-label">{ring.name}</span>
              <span className="ring-picker__stop-count">{ring.stops.length}</span>
            </button>
          )
        })}
      </div>
      <div
        className="ring-picker__accent"
        style={{ '--accent-color': accentColor } as CSSProperties}
        aria-hidden
      />
    </header>
  )
}
