import { useCallback, useState } from 'react'

type Props = {
  active: boolean
  csvText: string | null
  csvLoaded: boolean
  csvError: string | null
}

export function StopsOverviewPanel({
  active,
  csvText,
  csvLoaded,
  csvError,
}: Props) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async () => {
    if (!csvText) return
    try {
      await navigator.clipboard.writeText(csvText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [csvText])

  if (!active) return null

  return (
    <section className="stops-overview" aria-label="Durak listesi CSV">
      <div className="stops-overview__head">
        <span className="stops-overview__title">stop_id, stop_lat, stop_lon</span>
        <button
          type="button"
          className="stops-overview__copy"
          onClick={copy}
          disabled={!csvText}
        >
          {copied ? 'Kopyalandı' : 'Panoya kopyala'}
        </button>
      </div>
      {csvError ? (
        <p className="stops-overview__err">{csvError}</p>
      ) : !csvLoaded ? (
        <p className="stops-overview__loading">Yükleniyor…</p>
      ) : csvText ? (
        <pre className="stops-overview__pre">{csvText}</pre>
      ) : (
        <p className="stops-overview__err">CSV boş</p>
      )}
    </section>
  )
}
