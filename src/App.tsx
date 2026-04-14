import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  clearEditorDraft,
  readEditorDraft,
  writeEditorDraft,
} from './lib/editorDraftStorage'
import { downloadTextFile } from './lib/downloadText'
import { patchOverviewCsvLine } from './lib/patchOverviewCsvText'
import { ringsDataSchema } from './lib/ringsSchema'
import { getDayProfile } from './lib/dayProfile'
import {
  isGriFamily,
  metroPickerLowFocus,
  ringPickerBucket,
  sortRingsForPicker,
} from './lib/ringServiceStatus'
import { isStopEditorEnabled } from './lib/stopEditorEnv'
import { METRO_VIEW_ID } from './lib/mapView'
import { metroLineAsRing } from './lib/metroRing'
import { publicUrl } from './lib/publicUrl'
import { nearestPolylineVertexIndex } from './lib/splitPolylineNearStop'
import {
  parseStopsOverviewCsv,
  type CsvOverviewStop,
} from './lib/parseStopsOverviewCsv'
import type { MetroLine, Ring } from './types/rings'
import { CsvStopSheet } from './components/CsvStopSheet'
import { RingPicker } from './components/RingPicker'
import { RingMap } from './components/RingMap'
import { MetroTimesPanel } from './components/MetroTimesPanel'
import { StopTimesSheet } from './components/StopTimesSheet'
import { StopEditorPanel, type DraftStop } from './components/StopEditorPanel'

function App() {
  const showStopEditor = isStopEditorEnabled()
  const [rings, setRings] = useState<Ring[]>([])
  const [metro, setMetro] = useState<MetroLine | null>(null)
  const [eveningHour, setEveningHour] = useState(17)
  const [selectedRingId, setSelectedRingId] = useState<string | null>(null)
  const [griLegFilter, setGriLegFilter] = useState<'all' | 'a2-a1' | 'a1-a2'>('all')
  const [openStopRef, setOpenStopRef] = useState<{
    ringId: string
    stopId: string
  } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [clock, setClock] = useState(() => Date.now())

  const [stopEditorActive, setStopEditorActive] = useState(false)
  const [pendingLatLng, setPendingLatLng] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [draftStops, setDraftStops] = useState<DraftStop[]>([])
  const [repositionStopsActive, setRepositionStopsActive] = useState(false)
  const [ringsDataDirty, setRingsDataDirty] = useState(false)
  const [browserDraftSavedAt, setBrowserDraftSavedAt] = useState<string | null>(
    null,
  )
  const [editorFileFeedback, setEditorFileFeedback] = useState<string | null>(
    null,
  )

  const [overviewCsvText, setOverviewCsvText] = useState<string | null>(null)
  const [, setOverviewStops] = useState<CsvOverviewStop[]>([])
  const [csvOnlyStop, setCsvOnlyStop] = useState<{
    id: string
    lat: number
    lng: number
  } | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch(publicUrl('data/stops-overview.csv'))
      .then((res) => {
        if (!res.ok) throw new Error(`CSV okunamadı (${res.status})`)
        return res.text()
      })
      .then((t) => {
        if (cancelled) return
        setOverviewCsvText(t.trim())
        setOverviewStops(parseStopsOverviewCsv(t))
      })
      .catch(() => {
        if (!cancelled) {
          setOverviewCsvText(null)
          setOverviewStops([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!showStopEditor) return
    setBrowserDraftSavedAt(readEditorDraft()?.savedAt ?? null)
  }, [showStopEditor])

  useEffect(() => {
    if (!showStopEditor || !stopEditorActive || !ringsDataDirty) return
    const id = window.setTimeout(() => {
      const savedAt = writeEditorDraft({
        eveningHourLocal: eveningHour,
        rings,
        overviewCsvText,
        metro,
      })
      setBrowserDraftSavedAt(savedAt)
    }, 600)
    return () => window.clearTimeout(id)
  }, [
    showStopEditor,
    stopEditorActive,
    ringsDataDirty,
    eveningHour,
    rings,
    overviewCsvText,
    metro,
  ])

  useEffect(() => {
    setOpenStopRef(null)
    setCsvOnlyStop(null)
    setGriLegFilter('all')
  }, [selectedRingId])

  useEffect(() => {
    if (!stopEditorActive) {
      setPendingLatLng(null)
      setRepositionStopsActive(false)
    }
  }, [stopEditorActive])

  const reloadDataFromServer = useCallback(async () => {
    setLoadError(null)
    try {
      const res = await fetch(publicUrl('data/rings.json'))
      if (!res.ok) throw new Error(`Veri yüklenemedi (${res.status})`)
      const json = await res.json()
      const parsed = ringsDataSchema.safeParse(json)
      if (!parsed.success) {
        console.error(parsed.error)
        throw new Error('rings.json şeması geçersiz')
      }
      setEveningHour(parsed.data.eveningHourLocal)
      setRings(parsed.data.rings)
      setMetro(parsed.data.metro ?? null)

      const cr = await fetch(publicUrl('data/stops-overview.csv'))
      if (cr.ok) {
        const t = await cr.text()
        const trimmed = t.trim()
        setOverviewCsvText(trimmed)
        setOverviewStops(parseStopsOverviewCsv(t))
      }
      clearEditorDraft()
      setBrowserDraftSavedAt(null)
      setRingsDataDirty(false)
      setRepositionStopsActive(false)
      setOpenStopRef(null)
      setCsvOnlyStop(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Bilinmeyen hata')
    }
  }, [])

  const applyStopPosition = useCallback(
    (ringId: string, stopId: string, lat: number, lng: number) => {
      if (ringId === METRO_VIEW_ID) {
        setMetro((m) =>
          m
            ? {
                ...m,
                stops: m.stops.map((s) =>
                  s.id !== stopId ? s : { ...s, lat, lng },
                ),
              }
            : null,
        )
        setRingsDataDirty(true)
        return
      }
      setRings((prev) =>
        prev.map((ring) =>
          ring.id !== ringId
            ? ring
            : {
                ...ring,
                stops: ring.stops.map((s) =>
                  s.id !== stopId ? s : { ...s, lat, lng },
                ),
              },
        ),
      )
      setOverviewStops((prev) =>
        prev.map((row) =>
          row.id === stopId ? { ...row, lat, lng } : row,
        ),
      )
      setOverviewCsvText((t) =>
        t ? patchOverviewCsvLine(t, stopId, lat, lng) : t,
      )
      setRingsDataDirty(true)
    },
    [],
  )

  const handleExportRingsJson = useCallback(() => {
    const doc = {
      eveningHourLocal: eveningHour,
      rings,
      ...(metro ? { metro } : {}),
    }
    const json = JSON.stringify(doc, null, 2) + '\n'
    downloadTextFile('rings.json', json)
    if (overviewCsvText != null) {
      downloadTextFile(
        'stops-overview.csv',
        `${overviewCsvText.trim()}\n`,
        'text/csv',
      )
    }
    if (showStopEditor && stopEditorActive) {
      const savedAt = writeEditorDraft({
        eveningHourLocal: eveningHour,
        rings,
        overviewCsvText,
        metro,
      })
      setBrowserDraftSavedAt(savedAt)
    }
    setRingsDataDirty(false)
  }, [
    eveningHour,
    rings,
    metro,
    overviewCsvText,
    showStopEditor,
    stopEditorActive,
  ])

  const flashEditorFeedback = useCallback((msg: string) => {
    setEditorFileFeedback(msg)
    window.setTimeout(() => setEditorFileFeedback(null), 4500)
  }, [])

  const syncRingStopsFromOverview = useCallback((rows: CsvOverviewStop[]) => {
    const byId = new Map(rows.map((r) => [r.id, r]))
    setRings((prev) =>
      prev.map((ring) => ({
        ...ring,
        stops: ring.stops.map((s) => {
          const o = byId.get(s.id)
          return o ? { ...s, lat: o.lat, lng: o.lng } : s
        }),
      })),
    )
  }, [])

  const handleRestoreBrowserDraft = useCallback(() => {
    const d = readEditorDraft()
    if (!d) {
      flashEditorFeedback('Tarayıcıda kayıtlı taslak yok.')
      setBrowserDraftSavedAt(null)
      return
    }
    setEveningHour(d.eveningHourLocal)
    setRings(d.rings)
    setMetro(d.metro ?? null)
    if (d.overviewCsvText != null && d.overviewCsvText.trim() !== '') {
      const t = d.overviewCsvText.trim()
      setOverviewCsvText(t)
      setOverviewStops(parseStopsOverviewCsv(t))
    }
    setRingsDataDirty(true)
    flashEditorFeedback('Taslak belleğe yüklendi; isterseniz tekrar indirin.')
  }, [flashEditorFeedback])

  const handleClearBrowserDraft = useCallback(() => {
    clearEditorDraft()
    setBrowserDraftSavedAt(null)
    flashEditorFeedback('Tarayıcı taslağı silindi.')
  }, [flashEditorFeedback])

  const handleImportRingsJsonFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text()
        const json = JSON.parse(text) as unknown
        const parsed = ringsDataSchema.safeParse(json)
        if (!parsed.success) {
          flashEditorFeedback('rings.json şemaya uymuyor veya dosya bozuk.')
          return
        }
        setEveningHour(parsed.data.eveningHourLocal)
        setRings(parsed.data.rings)
        setMetro(parsed.data.metro ?? null)
        setRingsDataDirty(true)
        flashEditorFeedback(`rings.json yüklendi (${file.name}).`)
      } catch {
        flashEditorFeedback('rings.json okunamadı.')
      }
    },
    [flashEditorFeedback],
  )

  const handleImportOverviewCsvFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text()
        const trimmed = text.trim()
        const rows = parseStopsOverviewCsv(trimmed)
        if (rows.length === 0) {
          flashEditorFeedback('CSV’de geçerli durak satırı bulunamadı.')
          return
        }
        setOverviewCsvText(trimmed)
        setOverviewStops(rows)
        syncRingStopsFromOverview(rows)
        setRingsDataDirty(true)
        flashEditorFeedback(`stops-overview.csv uygulandı (${file.name}).`)
      } catch {
        flashEditorFeedback('CSV okunamadı.')
      }
    },
    [flashEditorFeedback, syncRingStopsFromOverview],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(publicUrl('data/rings.json'))
        if (!res.ok) throw new Error(`Veri yüklenemedi (${res.status})`)
        const json = await res.json()
        const parsed = ringsDataSchema.safeParse(json)
        if (!parsed.success) {
          console.error(parsed.error)
          throw new Error('rings.json şeması geçersiz')
        }
        if (cancelled) return
        setEveningHour(parsed.data.eveningHourLocal)
        setRings(parsed.data.rings)
        setMetro(parsed.data.metro ?? null)
        
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Bilinmeyen hata')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const GRI_SPLIT_INDEX = 21

  const ringsToShow = useMemo(() => {
    if (selectedRingId === METRO_VIEW_ID && metro) {
      return [metroLineAsRing(metro)]
    }
    if (!selectedRingId) return []
    const matched = rings.filter((r) => r.id === selectedRingId)
    if (!isGriFamily(selectedRingId) || griLegFilter === 'all') return matched
    return matched.map((ring) => {
      const splitStop = ring.stops[GRI_SPLIT_INDEX]

      let filteredPolyline = ring.polyline
      if (ring.polyline.length >= 2 && splitStop) {
        const k = nearestPolylineVertexIndex(
          ring.polyline as [number, number][],
          splitStop.lat,
          splitStop.lng,
        )
        const safeK = Math.min(Math.max(k, 1), ring.polyline.length - 1)
        filteredPolyline =
          griLegFilter === 'a2-a1'
            ? ring.polyline.slice(0, safeK + 1)
            : ring.polyline.slice(safeK)
      }

      return { ...ring, polyline: filteredPolyline }
    })
  }, [rings, selectedRingId, metro, griLegFilter])

  const showRoutePolylines = selectedRingId !== METRO_VIEW_ID

  const griVisibleStopRange = useMemo<[number, number] | null>(() => {
    if (
      !selectedRingId ||
      !isGriFamily(selectedRingId) ||
      griLegFilter === 'all'
    )
      return null
    if (griLegFilter === 'a2-a1') return [0, GRI_SPLIT_INDEX]
    return [GRI_SPLIT_INDEX, 38]
  }, [selectedRingId, griLegFilter])

  const scheduleDate = useMemo(() => new Date(clock), [clock])
  const dayInfo = useMemo(
    () => getDayProfile(scheduleDate, eveningHour),
    [scheduleDate, eveningHour],
  )
  const isWeekend = dayInfo.profile === 'weekend'

  const ringsSortedForPicker = useMemo(
    () => sortRingsForPicker(rings, dayInfo, scheduleDate, scheduleDate),
    [rings, dayInfo, scheduleDate],
  )

  const lowFocusRingIds = useMemo(() => {
    const s = new Set<string>()
    for (const r of rings) {
      if (ringPickerBucket(r, dayInfo, scheduleDate, scheduleDate) !== 'active') {
        s.add(r.id)
      }
    }
    return s
  }, [rings, dayInfo, scheduleDate])

  const metroLowFocus = useMemo(
    () => (metro ? metroPickerLowFocus(metro, dayInfo, scheduleDate) : true),
    [metro, dayInfo, scheduleDate],
  )

  useEffect(() => {
    if (!rings.length) return
    setSelectedRingId((prev) => {
      if (prev === METRO_VIEW_ID && metro && !isWeekend) return prev
      if (prev && rings.some((r) => r.id === prev)) return prev
      const sorted = sortRingsForPicker(rings, dayInfo, scheduleDate, scheduleDate)
      const firstActive = sorted.find(
        (r) => ringPickerBucket(r, dayInfo, scheduleDate, scheduleDate) === 'active',
      )
      if (firstActive) return firstActive.id
      if (metro && !isWeekend) return METRO_VIEW_ID
      return sorted[0]?.id ?? null
    })
  }, [rings, dayInfo, scheduleDate, metro, isWeekend])

  const firstRingIdForRouteDraw = useMemo(() => {
    const sorted = sortRingsForPicker(rings, dayInfo, scheduleDate, scheduleDate)
    const firstActive = sorted.find(
      (r) => ringPickerBucket(r, dayInfo, scheduleDate, scheduleDate) === 'active',
    )
    return firstActive?.id ?? sorted[0]?.id ?? null
  }, [rings, dayInfo, scheduleDate])

  const stopSheetPayload = useMemo(() => {
    if (!openStopRef) return null
    if (openStopRef.ringId === METRO_VIEW_ID && metro) {
      const stop = metro.stops.find((s) => s.id === openStopRef.stopId)
      if (!stop) return null
      return { ring: metroLineAsRing(metro), stop }
    }
    const ring = rings.find((r) => r.id === openStopRef.ringId)
    const stop = ring?.stops.find((s) => s.id === openStopRef.stopId)
    if (!ring || !stop) return null
    return { ring, stop }
  }, [rings, openStopRef, metro])

  const handleStopClick = useCallback(
    (ringId: string, stopId: string) => {
      if (stopEditorActive) return
      setCsvOnlyStop(null)
      setOpenStopRef({ ringId, stopId })
    },
    [stopEditorActive],
  )

  const handleCsvOverviewStopClick = useCallback(
    (stopId: string, lat: number, lng: number) => {
      if (stopEditorActive) return
      for (const ring of rings) {
        const s = ring.stops.find((x) => x.id === stopId)
        if (s) {
          setCsvOnlyStop(null)
          setOpenStopRef({ ringId: ring.id, stopId })
          return
        }
      }
      setOpenStopRef(null)
      setCsvOnlyStop({ id: stopId, lat, lng })
    },
    [rings, stopEditorActive],
  )

  const closeSheet = useCallback(() => setOpenStopRef(null), [])
  const closeCsvSheet = useCallback(() => setCsvOnlyStop(null), [])

  const handleEditorMapClick = useCallback((lat: number, lng: number) => {
    setPendingLatLng({ lat, lng })
  }, [])

  const handlePendingConfirm = useCallback((id: string, name: string) => {
    setPendingLatLng((p) => {
      if (!p) return null
      const { lat, lng } = p
      setDraftStops((list) => [
        ...list,
        { key: crypto.randomUUID(), id, name, lat, lng },
      ])
      return null
    })
  }, [])

  const handlePendingClear = useCallback(() => setPendingLatLng(null), [])

  const handleRemoveDraft = useCallback((key: string) => {
    setDraftStops((list) => list.filter((d) => d.key !== key))
  }, [])

  const handleClearDrafts = useCallback(() => setDraftStops([]), [])

  if (loadError) {
    return (
      <div className="app app--error">
        <p>{loadError}</p>
      </div>
    )
  }

  if (!rings.length) {
    return (
      <div className="app app--loading">
        <p>Ring verileri yükleniyor…</p>
      </div>
    )
  }

  return (
    <div className="app">
      <RingPicker
        rings={ringsSortedForPicker}
        lowFocusRingIds={lowFocusRingIds}
        hasMetro={!isWeekend && Boolean(metro)}
        metroLowFocus={metroLowFocus}
        selectedId={selectedRingId}
        onSelect={setSelectedRingId}
      />
      {isGriFamily(selectedRingId ?? '') && !stopEditorActive ? (
        <div className="gri-filter">
          <button
            type="button"
            className={`gri-filter__btn${griLegFilter === 'all' ? ' gri-filter__btn--active' : ''}`}
            onClick={() => setGriLegFilter('all')}
          >
            Tümü
          </button>
          <button
            type="button"
            className={`gri-filter__btn${griLegFilter === 'a2-a1' ? ' gri-filter__btn--active' : ''}`}
            onClick={() => setGriLegFilter('a2-a1')}
          >
            A2 → A1
          </button>
          <button
            type="button"
            className={`gri-filter__btn${griLegFilter === 'a1-a2' ? ' gri-filter__btn--active' : ''}`}
            onClick={() => setGriLegFilter('a1-a2')}
          >
            A1 → A2
          </button>
        </div>
      ) : null}
      {selectedRingId === METRO_VIEW_ID &&
      metro &&
      !(stopEditorActive && showStopEditor) ? (
        <MetroTimesPanel
          metro={metro}
          scheduleNow={scheduleDate}
        />
      ) : null}
      {showStopEditor ? (
        <StopEditorPanel
          active={stopEditorActive}
          onActiveChange={setStopEditorActive}
          pendingLatLng={pendingLatLng}
          onPendingClear={handlePendingClear}
          onPendingConfirm={handlePendingConfirm}
          drafts={draftStops}
          onRemoveDraft={handleRemoveDraft}
          onClearDrafts={handleClearDrafts}
          repositionActive={repositionStopsActive}
          onRepositionChange={setRepositionStopsActive}
          ringsDataDirty={ringsDataDirty}
          onExportRingsJson={handleExportRingsJson}
          onReloadData={reloadDataFromServer}
          browserDraftSavedAt={browserDraftSavedAt}
          onRestoreBrowserDraft={handleRestoreBrowserDraft}
          onClearBrowserDraft={handleClearBrowserDraft}
          onImportRingsJsonFile={handleImportRingsJsonFile}
          onImportOverviewCsvFile={handleImportOverviewCsvFile}
          fileFeedback={editorFileFeedback}
        />
      ) : null}
      <RingMap
        ringsToShow={ringsToShow}
        showRoutePolylines={showRoutePolylines}
        csvOverviewStops={[]}
        onStopClick={handleStopClick}
        onCsvOverviewStopClick={handleCsvOverviewStopClick}
        stopEditorActive={stopEditorActive && showStopEditor}
        stopRepositionActive={
          Boolean(stopEditorActive && showStopEditor && repositionStopsActive) &&
          selectedRingId !== METRO_VIEW_ID
        }
        onStopPositionChange={
          showStopEditor ? applyStopPosition : undefined
        }
        onEditorMapClick={showStopEditor ? handleEditorMapClick : undefined}
        draftStops={stopEditorActive ? draftStops : []}
        firstRingIdForRouteDraw={firstRingIdForRouteDraw}
        suppressStopMarkers={selectedRingId === METRO_VIEW_ID}
        visibleStopRange={griVisibleStopRange}
      />
      <p className="app__map-hint" aria-live="polite">
        {stopEditorActive && showStopEditor
          ? repositionStopsActive
            ? 'Durak işaretini sürükleyin. Bitince panelde “Tamam — rings.json indir”.'
            : 'Durak ekleme: haritaya tıklayın. Haritayı kaydırmak için sürükleyin.'
          : selectedRingId === METRO_VIEW_ID
            ? 'Metro sefer saatleri yukarıda listelenir; haritada durak işareti yok.'
            : 'Haritayı fare tekerleği veya +/- ile yakınlaştırın; dokunmatikte iki parmak da kullanılabilir.'}
      </p>
      {stopSheetPayload && !stopEditorActive ? (
        <StopTimesSheet
          ring={stopSheetPayload.ring}
          stop={stopSheetPayload.stop}
          activeProfile={dayInfo.profile}
          activeProfileLabel={dayInfo.label}
          scheduleNow={scheduleDate}
          onClose={closeSheet}
        />
      ) : null}
      {csvOnlyStop && !stopEditorActive ? (
        <CsvStopSheet
          stopId={csvOnlyStop.id}
          lat={csvOnlyStop.lat}
          lng={csvOnlyStop.lng}
          onClose={closeCsvSheet}
        />
      ) : null}
    </div>
  )
}

export default App
