import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { offsetGriPolylineForSevenYol } from '../lib/sevenYolCorridor'
import { nearestPolylineVertexIndex } from '../lib/splitPolylineNearStop'

/** Gri ring: ilk N durak / sonrası iki kontrastlı gri */
const GRI_LEG1_COLOR = '#0f172a'
/** Açık haritada da okunur, birinci bacakla güçlü kontrast */
const GRI_LEG2_COLOR = '#94a3b8'

type Props = {
  positions: [number, number][]
  color: string
  ringId: string
  /** Veri dosyasındaki ilk hat: rotaya tıklanınca çizim animasyonu */
  drawClickAnimation?: boolean
  /**
   * İlk bacak: durak 1..firstLegStopCount (dahil), sonrası ikinci renk.
   * Bölünme, (firstLegStopCount)’inci duraktan sonraki ilk durağa (index firstLegStopCount) en yakın polyline köşesinde.
   */
  dualToneSplit?: {
    stopsLatLng: { lat: number; lng: number }[]
    firstLegStopCount: number
  }
}

function safeClassSuffix(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_')
}

function pathEl(pl: L.Polyline): SVGPathElement | null {
  const p = (pl as unknown as { _path?: SVGPathElement })._path
  return p ?? null
}

const DRAW_MS = 2600
const DRAW_EASE = 'cubic-bezier(0.2, 0.85, 0.35, 1)'

/**
 * Ring renginde tek çizgi + ince akan çizgi.
 * Gri ring: iki ton + her bacakta yanal ofset (aynı yolun iki kez çizilmesini ayırır). İlk hat: tıklanınca çizim animasyonu.
 */
export function RingPolylineWithArrows({
  positions,
  color,
  ringId,
  drawClickAnimation = false,
  dualToneSplit,
}: Props) {
  const map = useMap()
  const drawBusyRef = useRef(false)
  const layersRef = useRef<{
    segments: L.Polyline[]
    flows: L.Polyline[]
    hit: L.Polyline | null
  } | null>(null)

  useEffect(() => {
    if (layersRef.current) {
      const cur = layersRef.current
      if (cur.hit) {
        cur.hit.off()
        map.removeLayer(cur.hit)
      }
      for (const f of cur.flows) map.removeLayer(f)
      for (const pl of cur.segments) map.removeLayer(pl)
      layersRef.current = null
    }

    if (positions.length < 2) return

    const flowClass = `ring-route-flow-dash ring-route-flow-dash--${safeClassSuffix(ringId)}`
    const segments: L.Polyline[] = []

    const useDualGri =
      dualToneSplit != null &&
      dualToneSplit.stopsLatLng.length > dualToneSplit.firstLegStopCount

    let endCol = color
    let griSplitK: number | null = null

    if (useDualGri) {
      const { stopsLatLng, firstLegStopCount } = dualToneSplit!
      const nextStop = stopsLatLng[firstLegStopCount]
      let k = nearestPolylineVertexIndex(
        positions,
        nextStop.lat,
        nextStop.lng,
      )
      k = Math.min(Math.max(k, 1), positions.length - 1)
      griSplitK = k

      const leg1 = positions.slice(0, k + 1) as [number, number][]
      const leg2 = positions.slice(k) as [number, number][]
      const leg1Draw = offsetGriPolylineForSevenYol(leg1, 'left')
      const leg2Draw = offsetGriPolylineForSevenYol(leg2, 'right')

      if (leg1Draw.length >= 2) {
        const pl = L.polyline(leg1Draw, {
          color: GRI_LEG1_COLOR,
          weight: 9,
          opacity: 1,
          lineJoin: 'round',
          lineCap: 'round',
          interactive: false,
        })
        pl.addTo(map)
        segments.push(pl)
      }
      if (leg2Draw.length >= 2) {
        const pl = L.polyline(leg2Draw, {
          color: GRI_LEG2_COLOR,
          weight: 9,
          opacity: 1,
          lineJoin: 'round',
          lineCap: 'round',
          interactive: false,
        })
        pl.addTo(map)
        segments.push(pl)
      }
      endCol = GRI_LEG2_COLOR
    } else {
      const pl = L.polyline(positions, {
        color,
        weight: 9,
        opacity: 1,
        lineJoin: 'round',
        lineCap: 'round',
        interactive: false,
      })
      pl.addTo(map)
      segments.push(pl)
    }

    const flowOpts = {
      color: '#ffffff',
      weight: 4,
      opacity: 0.35,
      lineJoin: 'round' as const,
      lineCap: 'round' as const,
      dashArray: '12 28',
      className: flowClass,
      interactive: false,
    }

    const flowPolys: L.Polyline[] = []
    if (useDualGri && griSplitK != null) {
      const k = griSplitK
      const f1 = positions.slice(0, k + 1) as [number, number][]
      const f2 = positions.slice(k) as [number, number][]
      if (f1.length >= 2) {
        const pl = L.polyline(offsetGriPolylineForSevenYol(f1, 'left'), flowOpts)
        pl.addTo(map)
        flowPolys.push(pl)
      }
      if (f2.length >= 2) {
        const pl = L.polyline(offsetGriPolylineForSevenYol(f2, 'right'), flowOpts)
        pl.addTo(map)
        flowPolys.push(pl)
      }
    } else {
      const pl = L.polyline(positions, flowOpts)
      pl.addTo(map)
      flowPolys.push(pl)
    }

    let hitPoly: L.Polyline | null = null
    if (drawClickAnimation) {
      hitPoly = L.polyline(positions, {
        color: '#000',
        weight: 22,
        opacity: 0,
        className: 'ring-route-hit',
        interactive: true,
      })
      hitPoly.addTo(map)

      const runDraw = (e: L.LeafletMouseEvent) => {
        if (e.originalEvent) {
          L.DomEvent.stopPropagation(e.originalEvent)
        }
        L.DomEvent.stopPropagation(e)
        if (drawBusyRef.current) return
        const reduceMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches

        const segmentPaths = segments.map(pathEl).filter(Boolean) as SVGPathElement[]
        const flowPaths = flowPolys
          .map(pathEl)
          .filter(Boolean) as SVGPathElement[]

        const showBase = () => {
          for (const p of segmentPaths) {
            p.style.opacity = ''
            p.style.transition = ''
          }
          for (const p of flowPaths) {
            p.style.opacity = ''
            p.style.transition = ''
          }
          drawBusyRef.current = false
        }

        const hideBase = () => {
          for (const p of segmentPaths) {
            p.style.opacity = '0'
            p.style.transition = 'none'
          }
          for (const p of flowPaths) {
            p.style.opacity = '0'
            p.style.transition = 'none'
          }
        }

        drawBusyRef.current = true
        hideBase()

        if (reduceMotion) {
          window.setTimeout(showBase, 50)
          return
        }

        const drawPl = L.polyline(positions, {
          color: endCol,
          weight: 11,
          opacity: 1,
          lineJoin: 'round',
          lineCap: 'round',
          interactive: false,
          className: 'ring-route-draw-sweep',
        })
        drawPl.addTo(map)

        const startSweep = () => {
          const path = pathEl(drawPl)
          if (!path || typeof path.getTotalLength !== 'function') {
            map.removeLayer(drawPl)
            showBase()
            return
          }
          const len = path.getTotalLength()
          if (!Number.isFinite(len) || len < 1) {
            map.removeLayer(drawPl)
            showBase()
            return
          }
          path.style.strokeDasharray = `${len}`
          path.style.strokeDashoffset = `${len}`
          path.style.transition = 'none'
          void path.getBoundingClientRect()
          path.style.transition = `stroke-dashoffset ${DRAW_MS}ms ${DRAW_EASE}`
          path.style.strokeDashoffset = '0'

          let finished = false
          const finish = () => {
            if (finished) return
            finished = true
            path.removeEventListener('transitionend', onEnd)
            window.clearTimeout(fallbackTimer)
            map.removeLayer(drawPl)
            showBase()
          }
          const onEnd = (ev: TransitionEvent) => {
            if (ev.propertyName !== 'stroke-dashoffset') return
            finish()
          }
          path.addEventListener('transitionend', onEnd)
          const fallbackTimer = window.setTimeout(finish, DRAW_MS + 400)
        }

        requestAnimationFrame(() => requestAnimationFrame(startSweep))
      }

      hitPoly.on('click', runDraw)
    }

    layersRef.current = {
      segments,
      flows: flowPolys,
      hit: hitPoly,
    }

    return () => {
      const cur = layersRef.current
      layersRef.current = null
      if (!cur) return
      if (cur.hit) {
        cur.hit.off()
        map.removeLayer(cur.hit)
      }
      for (const f of cur.flows) map.removeLayer(f)
      for (const pl of cur.segments) map.removeLayer(pl)
    }
  }, [map, positions, color, ringId, drawClickAnimation, dualToneSplit])

  return null
}
