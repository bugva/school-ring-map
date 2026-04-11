export type DayProfile = 'weekend' | 'weekday_day' | 'weekday_evening'

export type StopTimes = {
  weekday_day: string[]
  weekday_evening: string[]
  /** Cumartesi (ve genel hafta sonu yedek) */
  weekend: string[]
  /** Pazar; yoksa `weekend` kullanılır */
  weekend_sunday?: string[]
}

export type Stop = {
  id: string
  name: string
  lat: number
  lng: number
  times: StopTimes
}

export type Ring = {
  id: string
  name: string
  color: string
  polyline: [number, number][]
  stops: Stop[]
}

/** rings.json içinde polyline yok; yalnızca istasyonlar ve saatler */
export type MetroLine = {
  name: string
  color: string
  stops: Stop[]
}

export type RingsData = {
  eveningHourLocal: number
  rings: Ring[]
  metro?: MetroLine
}
