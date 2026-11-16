const DROP =
  'script, style, iframe, frame, frameset, object, embed, form, link, meta, base, template, noscript, textarea, select, button, svg, math, a.anchor'
const URL_ATTRIBUTES = new Set(['href', 'src', 'xlink:href', 'poster'])
const SAFE_PROTOCOLS = new Set(['https:', 'http:', 'mailto:'])

function safeUrl(value: string, origin: string): string | null {
  try {
    const url = new URL(value, origin)
    return SAFE_PROTOCOLS.has(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

// The description is rendered by GitHub, which already sanitizes it. This is a second line of defence before v-html.
export function sanitizeHtml(html: string, origin = 'https://github.com'): string {
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, 'text/html')
  for (const el of doc.body.querySelectorAll(DROP)) el.remove()
  for (const el of doc.body.querySelectorAll('*')) {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase()
      if (name.startsWith('on') || name === 'style' || name === 'srcset' || name === 'formaction') el.removeAttribute(attr.name)
      else if (URL_ATTRIBUTES.has(name)) {
        const url = attr.value.startsWith('#') ? null : safeUrl(attr.value, origin)
        if (url) el.setAttribute(attr.name, url)
        else el.removeAttribute(attr.name)
      }
    }
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank')
      el.setAttribute('rel', 'noopener noreferrer')
    }
    if (el.tagName === 'INPUT') {
      if (el.getAttribute('type') === 'checkbox') el.setAttribute('disabled', '')
      else el.remove()
    }
  }
  return doc.body.innerHTML.trim()
}

export function plainText(html: string): string {
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${sanitizeHtml(html)}</body>`, 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}
