export type CsvOverviewStop = {
  id: string
  lat: number
  lng: number
}

/** stops-overview.csv: stop_id,stop_lat,stop_lon */
export function parseStopsOverviewCsv(text: string): CsvOverviewStop[] {
  const lines = text.trim().split(/\n/)
  const out: CsvOverviewStop[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const parts = line.split(',')
    const id = parts[0]?.trim()
    const lat = parseFloat(parts[1] ?? '')
    const lng = parseFloat(parts[2] ?? '')
    if (!id || Number.isNaN(lat) || Number.isNaN(lng)) continue
    out.push({ id, lat, lng })
  }
  return out
}
