/** stops-overview.csv metninde bir stop_id satırının koordinatını günceller */
export function patchOverviewCsvLine(
  csvText: string,
  stopId: string,
  lat: number,
  lng: number,
): string {
  const lines = csvText.split('\n')
  return lines
    .map((line, i) => {
      if (i === 0 || !line.trim()) return line
      const id = line.split(',')[0]?.trim()
      if (id === stopId) return `${stopId},${lat},${lng}`
      return line
    })
    .join('\n')
}
