import type { CSSProperties } from 'react'
import type { Ring } from '../types/rings'
import {
  ALL_STOPS_VIEW_ID,
  METRO_VIEW_ID,
  STOPS_ONLY_VIEW_ID,
} from '../lib/mapView'

type Props = {
  rings: Ring[]
  /** rings.json’da metro bölümü varsa */
  hasMetro: boolean
  selectedId: string | null
  onSelect: (id: string) => void
}

export function RingPicker({
  rings,
  hasMetro,
  selectedId,
  onSelect,
}: Props) {
  const allRoutesSelected = selectedId === ALL_STOPS_VIEW_ID
  const stopsOnlySelected = selectedId === STOPS_ONLY_VIEW_ID
  const metroSelected = selectedId === METRO_VIEW_ID

  return (
    <header className="ring-picker" role="navigation" aria-label="Ring seçimi">
      <p className="ring-picker__label">Ring hatları</p>
      <div className="ring-picker__chips" role="listbox" aria-label="Ring listesi">
        <button
          type="button"
          role="option"
          aria-selected={allRoutesSelected}
          className={`ring-picker__chip${allRoutesSelected ? ' ring-picker__chip--selected' : ''}`}
          style={{ '--ring-color': '#6366f1' } as CSSProperties}
          onClick={() => onSelect(ALL_STOPS_VIEW_ID)}
        >
          <span className="ring-picker__swatch ring-picker__swatch--all" aria-hidden />
          Tüm duraklar
        </button>
        <button
          type="button"
          role="option"
          aria-selected={stopsOnlySelected}
          className={`ring-picker__chip${stopsOnlySelected ? ' ring-picker__chip--selected' : ''}`}
          style={{ '--ring-color': '#0f172a' } as CSSProperties}
          onClick={() => onSelect(STOPS_ONLY_VIEW_ID)}
        >
          <span className="ring-picker__swatch ring-picker__swatch--stops-only" aria-hidden />
          Bütün duraklar
        </button>
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
            Metro
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
              {ring.name}
            </button>
          )
        })}
      </div>
    </header>
  )
}
