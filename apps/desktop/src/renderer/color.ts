// Turns a computed CSS colour (rgb() or rgba()) into #rrggbb for the native window. Anything else gives ''.
export function hexColor(css: string): string {
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(css.trim())
  if (!m) return /^#[0-9a-f]{6}$/i.test(css.trim()) ? css.trim().toLowerCase() : ''
  return `#${[m[1], m[2], m[3]]
    .map((n) =>
      Math.min(255, Math.round(Number(n)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

// Any colour the page can draw (oklch() included, which some themes use) as #rrggbb, by painting one pixel.
export function anyColorHex(css: string): string {
  const quick = hexColor(css)
  if (quick || typeof document === 'undefined') return quick
  try {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    if (!ctx) return ''
    ctx.fillStyle = css
    ctx.fillRect(0, 0, 1, 1)
    const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
  } catch {
    return ''
  }
}
