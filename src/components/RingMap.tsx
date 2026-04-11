import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import type { CsvOverviewStop } from '../lib/parseStopsOverviewCsv'
import type { Ring, Stop } from '../types/rings'
import type { DraftStop } from './StopEditorPanel'
import { RingPolylineWithArrows } from './RingPolylineWithArrows'
import { METRO_VIEW_ID } from '../lib/mapView'

function safeRingColor(color: string): string {
  return /^#[0-9A-Fa-f]{3,8}$/.test(color) ? color : '#6366f1'
}

function createStopDivIcon(ringColor: string, order: number): L.DivIcon {
  const c = safeRingColor(ringColor)
  const labelClass =
    order >= 10
      ? 'stop-marker-label stop-marker-label--compact'
      : 'stop-marker-label'
  return L.divIcon({
    className: 'stop-marker-leaflet',
    html: `<div class="stop-marker-hit" style="--ring-color:${c}" aria-hidden="true"><div class="stop-marker-pin"><span class="${labelClass}">${order}</span></div></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

/** Veri dosyasındaki duraklar özeti: tek renk, sadece konum */
const UPLOADED_STOPS_PIN = '#57534e'

function createUploadedStopsOnlyIcon(): L.DivIcon {
  return L.divIcon({
    className: 'stop-marker-leaflet',
    html: `<div class="stop-marker-hit" style="--ring-color:${UPLOADED_STOPS_PIN}" aria-hidden="true"><div class="stop-marker-pin stop-marker-pin--data-only"><span class="stop-marker-core stop-marker-core--data-only" aria-hidden="true"></span></div></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

/** Aynı konumdaki durakları tek işarette birleştir (yüzde ~1 m) — CSV yoksa yedek */
function uniqueStopsFromRings(
  rings: Ring[],
): { ringId: string; stop: Stop; mapKey: string }[] {
  const seen = new Map<string, { ringId: string; stop: Stop }>()
  for (const ring of rings) {
    for (const stop of ring.stops) {
      const k = `${stop.lat.toFixed(5)},${stop.lng.toFixed(5)}`
      if (!seen.has(k)) {
        seen.set(k, { ringId: ring.id, stop })
      }
    }
  }
  return [...seen.entries()].map(([coordKey, v]) => ({
    ...v,
    mapKey: `loc-${coordKey}`,
  }))
}

const DRAFT_ICON: L.DivIcon = L.divIcon({
  className: 'draft-stop-marker-leaflet',
  html:
    '<div class="stop-marker-hit" style="--ring-color:#f59e0b" aria-hidden="true"><div class="stop-marker-pin stop-marker-pin--draft"><span class="stop-marker-core"></span></div></div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

/** Yakınlaştıkça durak işaretini fazla büyümesin diye üst sınır (ekran pikseli). */
function scaleForZoom(z: number): number {
  if (z <= 14) return 1
  if (z >= 20) return 0.64
  if (z >= 18) return 0.72 - ((z - 18) / 2) * 0.08
  return 1 - ((z - 14) / 4) * 0.28
}

function MapMarkerZoomScale() {
  const map = useMap()

  useEffect(() => {
    const apply = () => {
      map.getContainer().style.setProperty(
        '--stop-marker-scale',
        String(scaleForZoom(map.getZoom())),
      )
    }
    map.on('zoomend', apply)
    map.on('zoom', apply)
    apply()
    return () => {
      map.off('zoomend', apply)
      map.off('zoom', apply)
    }
  }, [map])

  return null
}

function MapEditorClickHandler({
  enabled,
  onClick,
}: {
  enabled: boolean
  onClick: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

type Props = {
  ringsToShow: Ring[]
  showRoutePolylines?: boolean
  /** CSV'deki tüm noktalar (Bütün duraklar); doluysa haritada bunlar çizilir */
  csvOverviewStops?: CsvOverviewStop[]
  onStopClick: (ringId: string, stopId: string) => void
  /** CSV işaretinden tıklanınca (ring'de o id varsa App yine saat sayfasını açar) */
  onCsvOverviewStopClick: (stopId: string, lat: number, lng: number) => void
  stopEditorActive?: boolean
  /** Editör: ring duraklarını sürükleyerek taşı */
  stopRepositionActive?: boolean
  onStopPositionChange?: (ringId: string, stopId: string, lat: number, lng: number) => void
  onEditorMapClick?: (lat: number, lng: number) => void
  draftStops?: DraftStop[]
  /** rings.json sırasındaki ilk hat id'si; rotaya tıklanınca çizim animasyonu */
  firstRingIdForRouteDraw?: string | null
  /** Metro vb.: durak işaretlerini çizme */
  suppressStopMarkers?: boolean
  /** Görünür durak index aralığı [start, end] (dahil); null = hepsi */
  visibleStopRange?: [number, number] | null
}

const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a>'

const DEFAULT_CENTER: [number, number] = [39.897, 32.782]
const DEFAULT_ZOOM = 15
/** CARTO Voyager karoları 18'e kadar; üst zoom'da karo büyütülerek daha yakınlaşılır */
const MAP_MAX_ZOOM = 20
const TILE_MAX_NATIVE_ZOOM = 18

function boundsForRings(
  rings: Ring[],
  stopsOnly: boolean,
): L.LatLngBounds | null {
  const pts: L.LatLngExpression[] = []
  if (stopsOnly) {
    for (const { stop: s } of uniqueStopsFromRings(rings)) {
      pts.push([s.lat, s.lng])
    }
  } else {
    for (const ring of rings) {
      if (ring.polyline.length) {
        pts.push(...ring.polyline)
      } else {
        for (const s of ring.stops) {
          pts.push([s.lat, s.lng])
        }
      }
    }
  }
  if (!pts.length) return null
  return L.latLngBounds(pts)
}

function boundsForCsvStops(stops: CsvOverviewStop[]): L.LatLngBounds | null {
  if (!stops.length) return null
  return L.latLngBounds(stops.map((s) => [s.lat, s.lng] as L.LatLngExpression))
}

function FitMapBounds({
  rings,
  stopsOnlyFallback,
  csvStops,
}: {
  rings: Ring[]
  stopsOnlyFallback: boolean
  csvStops: CsvOverviewStop[] | undefined
}) {
  const map = useMap()

  useEffect(() => {
    const bounds =
      csvStops && csvStops.length > 0
        ? boundsForCsvStops(csvStops)
        : boundsForRings(rings, stopsOnlyFallback)
    if (!bounds) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
      return
    }
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: MAP_MAX_ZOOM })
  }, [map, rings, stopsOnlyFallback, csvStops])

  return null
}

function UserLocationMarker() {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [accuracy, setAccuracy] = useState(0)
  const map = useMap()

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setPosition(loc)
        setAccuracy(pos.coords.accuracy)
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10_000 },
    )
    return () => navigator.geolocation.clearWatch(watcher)
  }, [map])

  if (!position) return null

  return (
    <>
      <Circle
        center={[position.lat, position.lng]}
        radius={accuracy}
        pathOptions={{
          color: '#4285f4',
          fillColor: '#4285f4',
          fillOpacity: 0.1,
          weight: 1,
          opacity: 0.3,
        }}
      />
      <CircleMarker
        center={[position.lat, position.lng]}
        radius={7}
        pathOptions={{
          color: '#fff',
          fillColor: '#4285f4',
          fillOpacity: 1,
          weight: 2.5,
          opacity: 1,
        }}
      />
    </>
  )
}

export function RingMap({
  ringsToShow,
  showRoutePolylines = true,
  csvOverviewStops = [],
  onStopClick,
  onCsvOverviewStopClick,
  stopEditorActive = false,
  stopRepositionActive = false,
  onStopPositionChange,
  onEditorMapClick,
  draftStops = [],
  firstRingIdForRouteDraw = null,
  suppressStopMarkers = false,
  visibleStopRange = null,
}: Props) {
  /** ringId + stopIdx → sıralı numaralı işaret (her ring kendi 1..n) */
  const stopIconsByKey = useMemo(() => {
    const m = new Map<string, L.DivIcon>()
    for (const r of ringsToShow) {
      r.stops.forEach((_stop, stopIdx) => {
        m.set(
          `${r.id}\0${stopIdx}`,
          createStopDivIcon(r.color, stopIdx + 1),
        )
      })
    }
    return m
  }, [ringsToShow])

  /** Döngüsel rotalarda son durak ilk durakla aynı konumdaysa atlansın */
  const skipLastStop = useMemo(() => {
    const skip = new Set<string>()
    for (const r of ringsToShow) {
      if (r.stops.length < 2) continue
      const first = r.stops[0]
      const last = r.stops[r.stops.length - 1]
      const samePos =
        Math.abs(first.lat - last.lat) < 0.0001 &&
        Math.abs(first.lng - last.lng) < 0.0001
      if (samePos) {
        skip.add(`${r.id}\0${r.stops.length - 1}`)
      }
    }
    return skip
  }, [ringsToShow])

  const dataOnlyIcon = useMemo(() => createUploadedStopsOnlyIcon(), [])

  const useCsvMarkers =
    !showRoutePolylines && csvOverviewStops && csvOverviewStops.length > 0

  const uniqueUploadedStops = useMemo(
    () =>
      !showRoutePolylines && !useCsvMarkers
        ? uniqueStopsFromRings(ringsToShow)
        : [],
    [ringsToShow, showRoutePolylines, useCsvMarkers],
  )

  const editorClickEnabled = Boolean(stopEditorActive && onEditorMapClick)

  const csvForFit = useCsvMarkers ? csvOverviewStops : undefined

  return (
    <div
      className={[
        'ring-map-wrap',
        stopEditorActive ? 'ring-map-wrap--editor' : '',
        stopEditorActive && stopRepositionActive
          ? 'ring-map-wrap--reposition'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <MapContainer
        className="ring-map"
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        maxZoom={MAP_MAX_ZOOM}
        scrollWheelZoom
        dragging
        touchZoom
        doubleClickZoom
        zoomControl
        attributionControl
      >
        <TileLayer
          attribution={TILE_ATTR}
          url={TILE_URL}
          subdomains="abcd"
          maxZoom={MAP_MAX_ZOOM}
          maxNativeZoom={TILE_MAX_NATIVE_ZOOM}
        />
        <MapMarkerZoomScale />
        <UserLocationMarker />
        <FitMapBounds
          rings={ringsToShow}
          stopsOnlyFallback={!showRoutePolylines}
          csvStops={csvForFit}
        />
        {editorClickEnabled && onEditorMapClick ? (
          <MapEditorClickHandler enabled onClick={onEditorMapClick} />
        ) : null}
        {showRoutePolylines
          ? ringsToShow.map((ring) => (
              <Fragment key={ring.id}>
                {ring.polyline.length > 0 ? (
                  <RingPolylineWithArrows
                    key={ring.id}
                    ringId={ring.id}
                    positions={ring.polyline as [number, number][]}
                    color={ring.color}
                    drawClickAnimation={
                      Boolean(
                        firstRingIdForRouteDraw &&
                          ring.id === firstRingIdForRouteDraw &&
                          !stopEditorActive,
                      )
                    }
                    dualToneSplit={
                      ring.id === 'gri' && ring.stops.length > 22
                        ? {
                            stopsLatLng: ring.stops.map((s) => ({
                              lat: s.lat,
                              lng: s.lng,
                            })),
                            firstLegStopCount: 22,
                          }
                        : undefined
                    }
                  />
                ) : null}
                {ring.id === METRO_VIEW_ID
                  ? null
                  : ring.stops.map((stop, stopIdx) => {
                  const markerKey = `${ring.id}\0${stopIdx}`
                  if (skipLastStop.has(markerKey)) return null
                  if (visibleStopRange && (stopIdx < visibleStopRange[0] || stopIdx > visibleStopRange[1])) return null
                  const icon = stopIconsByKey.get(markerKey)
                  if (!icon) return null
                  return (
                    <Marker
                      key={`${ring.id}-${stopIdx}-${stop.id}`}
                      position={[stop.lat, stop.lng]}
                      icon={icon}
                      title={`${stopIdx + 1}. ${stop.name}`}
                      draggable={Boolean(
                        stopRepositionActive && onStopPositionChange,
                      )}
                      eventHandlers={{
                        click: () => {
                          if (stopRepositionActive) return
                          onStopClick(ring.id, stop.id)
                        },
                        dragend: (e) => {
                          if (!stopRepositionActive || !onStopPositionChange) {
                            return
                          }
                          const ll = (e.target as L.Marker).getLatLng()
                          onStopPositionChange(
                            ring.id,
                            stop.id,
                            ll.lat,
                            ll.lng,
                          )
                        },
                      }}
                    />
                  )
                })}
              </Fragment>
            ))
          : suppressStopMarkers
            ? null
          : useCsvMarkers
            ? csvOverviewStops.map((row, idx) => (
                <Marker
                  key={`csv-${row.id}-${idx}`}
                  position={[row.lat, row.lng]}
                  icon={dataOnlyIcon}
                  eventHandlers={{
                    click: () =>
                      onCsvOverviewStopClick(row.id, row.lat, row.lng),
                  }}
                />
              ))
            : uniqueUploadedStops.map(({ ringId, stop, mapKey }) => {
                const ring = ringsToShow.find((r) => r.id === ringId)
                const order = ring
                  ? ring.stops.findIndex((s) => s.id === stop.id)
                  : -1
                const num = order >= 0 ? order + 1 : 0
                const icon =
                  num > 0
                    ? (stopIconsByKey.get(`${ringId}\0${order}`) ??
                      dataOnlyIcon)
                    : dataOnlyIcon
                return (
                  <Marker
                    key={mapKey}
                    position={[stop.lat, stop.lng]}
                    icon={icon}
                    title={
                      num > 0 ? `${num}. ${stop.name}` : stop.name
                    }
                    draggable={Boolean(
                      stopRepositionActive && onStopPositionChange,
                    )}
                    eventHandlers={{
                      click: () => {
                        if (stopRepositionActive) return
                        onStopClick(ringId, stop.id)
                      },
                      dragend: (e) => {
                        if (!stopRepositionActive || !onStopPositionChange) {
                          return
                        }
                        const ll = (e.target as L.Marker).getLatLng()
                        onStopPositionChange(ringId, stop.id, ll.lat, ll.lng)
                      },
                    }}
                  />
                )
              })}
        {draftStops.map((d) => (
          <Marker key={d.key} position={[d.lat, d.lng]} icon={DRAFT_ICON} />
        ))}
      </MapContainer>
    </div>
  )
}
