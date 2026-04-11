import { METRO_VIEW_ID } from './mapView'
import type { MetroLine, Ring } from '../types/rings'

/** Harita / sheet için metro verisini tek “hat” gibi kullan (polyline yok). */
export function metroLineAsRing(metro: MetroLine): Ring {
  return {
    id: METRO_VIEW_ID,
    name: metro.name,
    color: metro.color,
    polyline: [],
    stops: metro.stops,
  }
}
