/**
 * Polyline üzerinde verilen (lat,lng) noktasına en yakın köşe indeksini bulur.
 */
export function nearestPolylineVertexIndex(
  polyline: [number, number][],
  lat: number,
  lng: number,
): number {
  let best = 0
  let bestSq = Infinity
  for (let i = 0; i < polyline.length; i++) {
    const dy = polyline[i][0] - lat
    const dx = polyline[i][1] - lng
    const sq = dy * dy + dx * dx
    if (sq < bestSq) {
      bestSq = sq
      best = i
    }
  }
  return best
}
