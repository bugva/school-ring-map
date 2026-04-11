/**
 * Gri ring çift bacak: aynı yol üst üste iki kez çizildiğinde iki rengi ayırmak için
 * polyline’a yanal ofset (metre). Eskiden sadece 7. Yol kutusunda uygulanıyordu; ring
 * verisinde yüzlerce tekrarlayan köşe kutunun dışında kaldığı için ofset tüm hat boyunca
 * uygulanır. Aşağıdaki kutu yalnızca referans / harici kullanım içindir.
 */

/** Referans: B.Yurtlar–ODTÜKent “7. Yol” dar koridoru (bbox ince ayarı) */
export const SEVEN_YOL_BBOX = {
  minLat: 39.88645,
  maxLat: 39.8912,
  minLng: 32.77635,
  maxLng: 32.7787,
} as const

/** Metre; çok büyük değer hatayı yoldan koparı gösterir */
const OFFSET_METERS = 2.3

export function pointInSevenYolBbox(lat: number, lng: number): boolean {
  return (
    lat >= SEVEN_YOL_BBOX.minLat &&
    lat <= SEVEN_YOL_BBOX.maxLat &&
    lng >= SEVEN_YOL_BBOX.minLng &&
    lng <= SEVEN_YOL_BBOX.maxLng
  )
}

function bearingDeg(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (Math.atan2(y, x) * 180) / Math.PI
}

function offsetPointMeters(
  lat: number,
  lng: number,
  bearingFromNorthDeg: number,
  distanceM: number,
): [number, number] {
  const R = 6378137
  const b = (bearingFromNorthDeg * Math.PI) / 180
  const north = distanceM * Math.cos(b)
  const east = distanceM * Math.sin(b)
  const dLat = (north / R) * (180 / Math.PI)
  const dLng =
    (east / (R * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI)
  return [lat + dLat, lng + dLng]
}

/**
 * Yol teğetine dik ofset — koyu bacak `left`, açık bacak `right`.
 * Tüm köşelerde uygulanır (ring’in aynı geometriyi iki bacakta tekrarlaması için gerekli).
 */
export function offsetGriPolylineForSevenYol(
  points: [number, number][],
  side: 'left' | 'right',
): [number, number][] {
  if (points.length < 2) return points
  const perpOffset = side === 'left' ? -90 : 90
  return points.map((p, i) => {
    const [lat, lng] = p
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(points.length - 1, i + 1)]
    const dlat = next[0] - prev[0]
    const dlng = next[1] - prev[1]
    if (dlat * dlat + dlng * dlng < 1e-20) return p
    const along = bearingDeg(prev[0], prev[1], next[0], next[1])
    if (!Number.isFinite(along)) return p
    const perp = along + perpOffset
    return offsetPointMeters(lat, lng, perp, OFFSET_METERS)
  })
}
