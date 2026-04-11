/** `public/` altındaki dosya (örn. `data/rings.json`). GitHub Pages alt dizininde doğru çözülür. */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL
  const p = path.replace(/^\//, '')
  return `${base}${p}`
}
