// Turns a computed CSS colour (rgb() or rgba()) into #rrggbb for the native window. Anything else gives ''.
export function hexColor(css: string): string {
  const m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(css.trim())
  if (!m) return /^#[0-9a-f]{6}$/i.test(css.trim()) ? css.trim().toLowerCase() : ''
  return `#${[m[1], m[2], m[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('')}`
}
