import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'

export type DraftStop = {
  key: string
  id: string
  name: string
  lat: number
  lng: number
}

type Props = {
  active: boolean
  onActiveChange: (on: boolean) => void
  pendingLatLng: { lat: number; lng: number } | null
  onPendingClear: () => void
  onPendingConfirm: (id: string, name: string) => void
  drafts: DraftStop[]
  onRemoveDraft: (key: string) => void
  onClearDrafts: () => void
  /** Ring duraklarını sürükleyerek taşıma */
  repositionActive: boolean
  onRepositionChange: (on: boolean) => void
  ringsDataDirty: boolean
  onExportRingsJson: () => void
  onReloadData: () => void
  /** ISO zaman; tarayıcı taslağı varsa */
  browserDraftSavedAt: string | null
  onRestoreBrowserDraft: () => void
  onClearBrowserDraft: () => void
  onImportRingsJsonFile: (file: File) => void | Promise<void>
  onImportOverviewCsvFile: (file: File) => void | Promise<void>
  fileFeedback: string | null
}

function formatCoord(n: number): string {
  return n.toFixed(6)
}

function stopsJsonSnippet(stops: DraftStop[]): string {
  const items = stops.map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    times: {
      weekday_day: [] as string[],
      weekday_evening: [] as string[],
      weekend: [] as string[],
    },
  }))
  return JSON.stringify(items, null, 2)
}

function stopsCsv(stops: DraftStop[]): string {
  const lines = ['stop_id,stop_lat,stop_lon']
  for (const s of stops) {
    lines.push(`${s.id},${formatCoord(s.lat)},${formatCoord(s.lng)}`)
  }
  return lines.join('\n')
}

export function StopEditorPanel({
  active,
  onActiveChange,
  pendingLatLng,
  onPendingClear,
  onPendingConfirm,
  drafts,
  onRemoveDraft,
  onClearDrafts,
  repositionActive,
  onRepositionChange,
  ringsDataDirty,
  onExportRingsJson,
  onReloadData,
  browserDraftSavedAt,
  onRestoreBrowserDraft,
  onClearBrowserDraft,
  onImportRingsJsonFile,
  onImportOverviewCsvFile,
  fileFeedback,
}: Props) {
  const formId = useId()
  const ringsFileRef = useRef<HTMLInputElement>(null)
  const csvFileRef = useRef<HTMLInputElement>(null)
  const [idInput, setIdInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [copyMsg, setCopyMsg] = useState<string | null>(null)

  const showMsg = useCallback((text: string) => {
    setCopyMsg(text)
    window.setTimeout(() => setCopyMsg(null), 2500)
  }, [])

  const handleCopyJson = useCallback(async () => {
    if (!drafts.length) return
    try {
      await navigator.clipboard.writeText(stopsJsonSnippet(drafts))
      showMsg('Durak JSON’u panoya kopyalandı (rings.json içindeki "stops" dizisine yapıştırın).')
    } catch {
      showMsg('Panoya kopyalanamadı.')
    }
  }, [drafts, showMsg])

  const handleCopyCsv = useCallback(async () => {
    if (!drafts.length) return
    try {
      await navigator.clipboard.writeText(stopsCsv(drafts))
      showMsg('CSV panoya kopyalandı.')
    } catch {
      showMsg('Panoya kopyalanamadı.')
    }
  }, [drafts, showMsg])

  const submitPending = useCallback(() => {
    const id = idInput.trim()
    if (!id || !pendingLatLng) return
    const name = nameInput.trim() || id
    onPendingConfirm(id, name)
    setIdInput('')
    setNameInput('')
  }, [idInput, nameInput, pendingLatLng, onPendingConfirm])

  const formatDraftTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('tr-TR', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    } catch {
      return iso
    }
  }

  const onRingsFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      e.target.value = ''
      if (f) void onImportRingsJsonFile(f)
    },
    [onImportRingsJsonFile],
  )

  const onCsvFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      e.target.value = ''
      if (f) void onImportOverviewCsvFile(f)
    },
    [onImportOverviewCsvFile],
  )

  return (
    <section className="stop-editor" aria-label="Durak ekleme aracı">
      <div className="stop-editor__row">
        <button
          type="button"
          className={`stop-editor__toggle${active ? ' stop-editor__toggle--on' : ''}`}
          onClick={() => onActiveChange(!active)}
        >
          Durak ekleme modu: {active ? 'Açık' : 'Kapalı'}
        </button>
        {active ? (
          <span className="stop-editor__badge">Geliştirme</span>
        ) : null}
      </div>

      {active ? (
        <>
          <div className="stop-editor__row stop-editor__row--wrap">
            <button
              type="button"
              className={`stop-editor__toggle stop-editor__toggle--secondary${
                repositionActive ? ' stop-editor__toggle--on' : ''
              }`}
              onClick={() => onRepositionChange(!repositionActive)}
            >
              Durak kaydır: {repositionActive ? 'Açık' : 'Kapalı'}
            </button>
          </div>
          <p className="stop-editor__help">
            <strong>Yeni durak:</strong> haritada boş alana tıklayın; formda{' '}
            <code>id</code> girin.
            <br />
            <strong>Kaydırma:</strong> “Durak kaydır” açıkken ring durak
            işaretini basılı tutup sürükleyin (telefonda parmağınızı
            işarette kısa bekletip kaydırın). Rota çizgisi aynı kalır; hat için
            sonra terminalde <code>rings:add-*</code> scriptlerini çalıştırın.
            <br />
            <strong>Bütün duraklar (CSV)</strong> görünümünde sürükleme yok —
            tek ring veya “Tüm duraklar” seçin.
            <br />
            Mevcut durak işaretine tıklayınca saat paneli açılmaz (mod açıkken).
            <br />
            <strong>Oturum:</strong> taşıdığınız konumlar tarayıcıda otomatik
            taslak olarak saklanır (sayfa yenilense bile). İndirdiğiniz{' '}
            <code>rings.json</code> ve <code>stops-overview.csv</code> dosyalarını
            bana veya projeye ekleyebilirsiniz.
          </p>

          {browserDraftSavedAt ? (
            <div className="stop-editor__commit stop-editor__commit--subtle">
              <p className="stop-editor__commit-title">
                Tarayıcı taslağı — {formatDraftTime(browserDraftSavedAt)}
              </p>
              <div className="stop-editor__commit-actions">
                <button
                  type="button"
                  className="stop-editor__btn stop-editor__btn--primary"
                  onClick={onRestoreBrowserDraft}
                >
                  Taslağı geri yükle
                </button>
                <button
                  type="button"
                  className="stop-editor__btn stop-editor__btn--danger"
                  onClick={onClearBrowserDraft}
                >
                  Taslağı sil
                </button>
              </div>
            </div>
          ) : null}

          <div className="stop-editor__import">
            <p className="stop-editor__import-title">Dosyadan yükle</p>
            <input
              ref={ringsFileRef}
              type="file"
              accept=".json,application/json"
              className="stop-editor__file-input"
              tabIndex={-1}
              onChange={onRingsFileChange}
            />
            <input
              ref={csvFileRef}
              type="file"
              accept=".csv,text/csv"
              className="stop-editor__file-input"
              tabIndex={-1}
              onChange={onCsvFileChange}
            />
            <div className="stop-editor__commit-actions">
              <button
                type="button"
                className="stop-editor__btn"
                onClick={() => ringsFileRef.current?.click()}
              >
                rings.json seç…
              </button>
              <button
                type="button"
                className="stop-editor__btn"
                onClick={() => csvFileRef.current?.click()}
              >
                stops-overview.csv seç…
              </button>
            </div>
          </div>

          {ringsDataDirty ? (
            <div className="stop-editor__commit">
              <p className="stop-editor__commit-title">Konum değişikliği var</p>
              <div className="stop-editor__commit-actions">
                <button
                  type="button"
                  className="stop-editor__btn stop-editor__btn--primary"
                  onClick={onExportRingsJson}
                >
                  Tamam — rings.json indir
                </button>
                <button type="button" className="stop-editor__btn" onClick={onReloadData}>
                  İptal — sunucudan yenile
                </button>
              </div>
              <p className="stop-editor__commit-hint">
                İndirilen dosyayı <code>public/data/rings.json</code> ile
                değiştirin. İsterseniz <code>stops-overview.csv</code> de
                otomatik güncellenmiş olur (aynı oturumda taşıdıysanız).
              </p>
            </div>
          ) : null}

          {pendingLatLng ? (
            <div className="stop-editor__form" role="dialog" aria-label="Yeni durak">
              <p className="stop-editor__form-title">Yeni durak</p>
              <p className="stop-editor__coords">
                {formatCoord(pendingLatLng.lat)}, {formatCoord(pendingLatLng.lng)}
              </p>
              <label className="stop-editor__label" htmlFor={`${formId}-id`}>
                Durak id
              </label>
              <input
                id={`${formId}-id`}
                className="stop-editor__input"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                placeholder="ornek-1"
                autoComplete="off"
              />
              <label className="stop-editor__label" htmlFor={`${formId}-name`}>
                Görünen ad (isteğe bağlı)
              </label>
              <input
                id={`${formId}-name`}
                className="stop-editor__input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="İd ile aynı bırakılabilir"
                autoComplete="off"
              />
              <div className="stop-editor__form-actions">
                <button type="button" className="stop-editor__btn" onClick={onPendingClear}>
                  İptal
                </button>
                <button
                  type="button"
                  className="stop-editor__btn stop-editor__btn--primary"
                  onClick={submitPending}
                  disabled={!idInput.trim()}
                >
                  Listeye ekle
                </button>
              </div>
            </div>
          ) : (
            <p className="stop-editor__wait">Haritaya tıklayın…</p>
          )}

          {drafts.length > 0 ? (
            <div className="stop-editor__list-wrap">
              <p className="stop-editor__list-title">Taslak ({drafts.length})</p>
              <ul className="stop-editor__list">
                {drafts.map((d) => (
                  <li key={d.key} className="stop-editor__list-item">
                    <span className="stop-editor__list-text">
                      <strong>{d.id}</strong> — {formatCoord(d.lat)}, {formatCoord(d.lng)}
                    </span>
                    <button
                      type="button"
                      className="stop-editor__btn-mini"
                      onClick={() => onRemoveDraft(d.key)}
                      aria-label={`${d.id} kaldır`}
                    >
                      Sil
                    </button>
                  </li>
                ))}
              </ul>
              <div className="stop-editor__export">
                <button type="button" className="stop-editor__btn" onClick={handleCopyJson}>
                  JSON kopyala
                </button>
                <button type="button" className="stop-editor__btn" onClick={handleCopyCsv}>
                  CSV kopyala
                </button>
                <button type="button" className="stop-editor__btn stop-editor__btn--danger" onClick={onClearDrafts}>
                  Taslakları temizle
                </button>
              </div>
            </div>
          ) : null}

          {copyMsg ? <p className="stop-editor__toast">{copyMsg}</p> : null}
          {fileFeedback ? (
            <p className="stop-editor__toast stop-editor__toast--info">
              {fileFeedback}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
