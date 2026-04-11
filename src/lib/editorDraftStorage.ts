import { z } from 'zod'
import { ringsDataSchema } from './ringsSchema'

export const EDITOR_DRAFT_STORAGE_KEY = 'school-ring-map-editor-draft-v1' as const

const editorDraftSchema = z.object({
  v: z.literal(1),
  savedAt: z.string(),
  eveningHourLocal: z.number().int().min(0).max(23),
  rings: ringsDataSchema.shape.rings,
  overviewCsvText: z.string().nullable(),
  metro: ringsDataSchema.shape.metro.optional().nullable(),
})

export type EditorDraft = z.infer<typeof editorDraftSchema>

export function readEditorDraft(): EditorDraft | null {
  try {
    const raw = localStorage.getItem(EDITOR_DRAFT_STORAGE_KEY)
    if (!raw) return null
    const res = editorDraftSchema.safeParse(JSON.parse(raw))
    return res.success ? res.data : null
  } catch {
    return null
  }
}

export function writeEditorDraft(payload: {
  eveningHourLocal: number
  rings: EditorDraft['rings']
  overviewCsvText: string | null
  metro?: EditorDraft['metro']
}): string {
  const savedAt = new Date().toISOString()
  const doc: EditorDraft = {
    v: 1,
    savedAt,
    eveningHourLocal: payload.eveningHourLocal,
    rings: payload.rings,
    overviewCsvText: payload.overviewCsvText,
    metro: payload.metro,
  }
  localStorage.setItem(EDITOR_DRAFT_STORAGE_KEY, JSON.stringify(doc))
  return savedAt
}

export function clearEditorDraft(): void {
  localStorage.removeItem(EDITOR_DRAFT_STORAGE_KEY)
}
