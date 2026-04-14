/**
 * Durak ekleme aracı: `npm run dev` sırasında veya
 * build öncesi `VITE_STOP_EDITOR=true`.
 * Aracı kapatmak için prod build kullanın ve env vermeyin.
 */
export function isStopEditorEnabled(): boolean {
  if (import.meta.env.DEV) return true
  if (import.meta.env.VITE_STOP_EDITOR === 'true') return true
  return false
}
