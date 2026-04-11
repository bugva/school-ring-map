/**
 * Durak ekleme aracı: `npm run dev` sırasında veya
 * build öncesi `VITE_STOP_EDITOR=true` veya URL'de `?stopEditor=1`.
 * Aracı kapatmak için prod build kullanın ve env/query vermeyin.
 */
export function isStopEditorEnabled(): boolean {
  if (import.meta.env.DEV) return true
  if (import.meta.env.VITE_STOP_EDITOR === 'true') return true
  if (typeof window !== 'undefined') {
    return new URLSearchParams(window.location.search).has('stopEditor')
  }
  return false
}
