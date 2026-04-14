type Props = {
  stopId: string
  lat: number
  lng: number
  onClose: () => void
}

export function CsvStopSheet({ stopId, lat, lng, onClose }: Props) {
  const line = `${stopId},${lat},${lng}`

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        className="stop-sheet csv-stop-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="csv-stop-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="stop-sheet__handle" aria-hidden />
        <header className="stop-sheet__head">
          <h2 id="csv-stop-title" className="stop-sheet__title">
            {stopId}
          </h2>
          <p className="stop-sheet__meta">Ring listesinde yok; yalnızca konum CSV’sinden</p>
          <button type="button" className="stop-sheet__close" onClick={onClose}>
            Kapat
          </button>
        </header>
        <div className="stop-sheet__body">
          <p className="csv-stop-sheet__coords">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </p>
          <button
            type="button"
            className="stop-sheet__toggle"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(line)
              } catch {
                /* ignore */
              }
            }}
          >
            Satırı kopyala (CSV)
          </button>
        </div>
      </section>
    </div>
  )
}
