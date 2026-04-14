import { z } from 'zod'

const stopTimesSchema = z.object({
  weekday_day: z.array(z.string()),
  weekday_evening: z.array(z.string()),
  weekend: z.array(z.string()),
  weekend_sunday: z.array(z.string()).optional(),
})

const stopSchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  times: stopTimesSchema,
})

const ringSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  polyline: z.array(z.tuple([z.number(), z.number()])),
  stops: z.array(stopSchema),
})

const metroLineSchema = z.object({
  name: z.string(),
  color: z.string(),
  stops: z.array(stopSchema),
})

export const ringsDataSchema = z.object({
  eveningHourLocal: z.number().int().min(0).max(23),
  rings: z.array(ringSchema),
  metro: metroLineSchema.optional(),
})
