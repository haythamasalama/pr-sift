import './style.css'

const html = document.documentElement
const systemDark = matchMedia('(prefers-color-scheme: dark)')
const themeButtons = document.querySelectorAll('[data-theme-mode]')

function applyTheme(mode) {
  html.dataset.theme = mode
  html.classList.toggle('dark', mode === 'dark' || (mode === 'system' && systemDark.matches))
  for (const button of themeButtons) button.setAttribute('aria-pressed', String(button.dataset.themeMode === mode))
}

function saveTheme(mode) {
  try {
    if (mode === 'system') localStorage.removeItem('theme')
    else localStorage.setItem('theme', mode)
  } catch {
    return
  }
}

applyTheme(html.dataset.theme || 'system')
systemDark.addEventListener('change', () => {
  if (html.dataset.theme === 'system') applyTheme('system')
})
for (const button of themeButtons) {
  button.addEventListener('click', () => {
    saveTheme(button.dataset.themeMode)
    applyTheme(button.dataset.themeMode)
  })
}

const menu = document.querySelector('[data-menu]')
if (menu) {
  document.addEventListener('click', (event) => {
    if (!menu.contains(event.target) || event.target.closest('a')) menu.open = false
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') menu.open = false
  })
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const onScreen = new IntersectionObserver(
  (entries) => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) target.play().catch(() => undefined)
      else target.pause()
    }
  },
  { threshold: 0.35 },
)
for (const video of document.querySelectorAll('video[data-autoplay]')) {
  if (reducedMotion) video.controls = true
  else onScreen.observe(video)
}

for (const demo of document.querySelectorAll('[data-demo]')) {
  const tabs = [...demo.querySelectorAll('[data-video]')]
  const videos = [...demo.querySelectorAll('[data-demo-video]')]
  const select = (tab) => {
    for (const other of tabs) other.setAttribute('aria-selected', String(other === tab))
    const name = tab.dataset.video
    for (const video of videos) {
      const file = `${name}${video.dataset.suffix}`
      video.poster = video.poster.replace(/[^/]+\.jpg$/, `${file}.jpg`)
      const source = video.querySelector('source')
      source.src = source.src.replace(/[^/]+\.mp4$/, `${file}.mp4`)
      video.setAttribute('aria-label', tab.textContent.trim())
      video.load()
      if (!reducedMotion && video.checkVisibility()) video.play().catch(() => undefined)
    }
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab))
    tab.addEventListener('keydown', (e) => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
      if (!step) return
      e.preventDefault()
      const next = tabs[(i + step + tabs.length) % tabs.length]
      next.focus()
      select(next)
    })
  })
}

for (const bar of document.querySelectorAll('[data-areas]')) {
  const chips = [...bar.querySelectorAll('[data-area]')]
  const items = [...document.querySelectorAll('li[data-area]')]
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      const area = chip.dataset.area
      for (const other of chips) other.setAttribute('aria-pressed', String(other === chip))
      for (const item of items) item.hidden = Boolean(area) && item.dataset.area !== area
      for (const section of document.querySelectorAll('article section')) {
        section.hidden = ![...section.querySelectorAll('li[data-area]')].some((item) => !item.hidden)
      }
    })
  }
}

const dotted = /^#v?(\d+\.\d+\.\d+)$/.exec(location.hash)
if (dotted) {
  const target = document.getElementById(`v${dotted[1].replace(/\./g, '-')}`)
  if (target) {
    history.replaceState(null, '', `#${target.id}`)
    target.scrollIntoView()
  }
}

for (const button of document.querySelectorAll('[data-copy-link]')) {
  button.addEventListener('click', async () => {
    const url = new URL(button.dataset.copyLink, location.href).href
    history.replaceState(null, '', button.dataset.copyLink)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      return
    }
    button.querySelector('[data-icon-idle]').hidden = true
    button.querySelector('[data-icon-done]').hidden = false
    button.title = 'Link copied'
    setTimeout(() => {
      button.querySelector('[data-icon-idle]').hidden = false
      button.querySelector('[data-icon-done]').hidden = true
      button.title = 'Copy link'
    }, 1500)
  })
}

for (const demo of document.querySelectorAll('[data-live-demo]')) {
  const frame = demo.querySelector('[data-live-frame]')
  // The demo loads on its own, so the wheel keeps scrolling the page until the visitor clicks into the demo.
  let engaged = false
  frame.addEventListener('pointerleave', () => (engaged = false))
  const passScroll = (win) => {
    win.addEventListener('pointerdown', () => (engaged = true), true)
    win.addEventListener(
      'wheel',
      (event) => {
        if (engaged || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
        event.preventDefault()
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
        window.scrollBy({ top: event.deltaY * unit, behavior: 'instant' })
      },
      { capture: true, passive: false },
    )
  }
  // The frame loads over the preview image, so the box never flashes empty.
  const start = () => {
    const iframe = document.createElement('iframe')
    iframe.src = frame.dataset.src
    iframe.title = 'PR Sift live demo'
    iframe.allow = 'clipboard-write'
    iframe.className = 'absolute inset-0 size-full border-0 bg-paper opacity-0 transition-opacity'
    iframe.addEventListener(
      'load',
      () => {
        passScroll(iframe.contentWindow)
        iframe.classList.remove('opacity-0')
        for (const child of [...frame.children]) if (child !== iframe) child.remove()
      },
      { once: true },
    )
    frame.append(iframe)
  }
  new IntersectionObserver(
    (entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      start()
    },
    { rootMargin: '300px' },
  ).observe(frame)
}
