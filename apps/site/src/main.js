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

// Feature cards on the home page. Each control keeps its state in an ARIA attribute that the card's classes read.
const features = document.querySelector('#features')
if (features) {
  const flip = (el, attr) => el.setAttribute(attr, String(el.getAttribute(attr) !== 'true'))
  const RING = 88 // circumference of the progress ring, as the dash array uses it

  const updateReview = (card) => {
    const total = Number(card.dataset.total)
    const shown = card.querySelectorAll('[data-file]')
    const viewed = [...shown].filter((f) => f.getAttribute('aria-pressed') === 'true').length
    const done = viewed + 3 // three files outside the drawn list are viewed already
    card.querySelector('[data-left]').textContent = String(total - done)
    card.querySelector('[data-done-count]').textContent = String(done)
    card.querySelector('[data-ring]')?.setAttribute('stroke-dasharray', `${((done / total) * RING).toFixed(1)} ${RING}`)
    const hide = card.querySelector('[data-hide-viewed]')?.getAttribute('aria-checked') === 'true'
    for (const f of shown) f.hidden = hide && f.getAttribute('aria-pressed') === 'true'
  }

  const toggleTree = (row) => {
    const open = row.getAttribute('aria-expanded') !== 'true'
    row.setAttribute('aria-expanded', String(open))
    const depth = Number(row.dataset.depth)
    let next = row.nextElementSibling
    // Show direct children only when opening; hide every descendant when closing.
    let hiddenBelow = Infinity
    while (next?.matches('[data-tree-row]') && Number(next.dataset.depth) > depth) {
      const d = Number(next.dataset.depth)
      if (!open) next.classList.add('hidden')
      else if (d <= hiddenBelow) {
        next.classList.remove('hidden')
        hiddenBelow = next.getAttribute('aria-expanded') === 'false' ? d : Infinity
      }
      next = next.nextElementSibling
    }
  }

  features.addEventListener('click', (event) => {
    const target = event.target
    const chip = target.closest('[data-chip]')
    if (chip) {
      if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) {
        const off = chip.dataset.state === 'off'
        if (off) delete chip.dataset.state
        else chip.dataset.state = 'off'
        chip.setAttribute('aria-pressed', 'false')
      } else {
        delete chip.dataset.state
        flip(chip, 'aria-pressed')
      }
      return
    }
    const sw = target.closest('[data-switch]')
    if (sw) {
      event.preventDefault()
      flip(sw, 'aria-checked')
      const review = sw.closest('[data-review]')
      if (review) updateReview(review)
      return
    }
    const file = target.closest('[data-file]')
    if (file) {
      flip(file, 'aria-pressed')
      updateReview(file.closest('[data-review]'))
      return
    }
    const row = target.closest('[data-tree-row][aria-expanded]')
    if (row) return toggleTree(row)
    const collapse = target.closest('[data-collapse]')
    if (collapse) {
      flip(collapse, 'aria-expanded')
      collapse.nextElementSibling.hidden = collapse.getAttribute('aria-expanded') !== 'true'
      return
    }
    const resolve = target.closest('[data-resolve]')
    if (resolve) {
      const note = resolve.closest('[data-note]')
      note.dataset.state = note.dataset.state === 'resolved' ? 'open' : 'resolved'
      return
    }
    const merge = target.closest('[data-merge]')
    if (merge) {
      merge.dataset.done = ''
      setTimeout(() => delete merge.dataset.done, 1800)
      return
    }
    const swatch = target.closest('[data-swatch]')
    if (swatch) {
      for (const s of swatch.parentElement.querySelectorAll('[data-swatch]')) s.setAttribute('aria-pressed', String(s === swatch))
      return
    }
    const press = target.closest('[data-press]')
    if (press) {
      const single = press.closest('[data-single]')
      if (single) for (const p of single.querySelectorAll('[data-press]')) p.setAttribute('aria-pressed', String(p === press))
      else flip(press, 'aria-pressed')
      const view = press.dataset.view
      if (view) for (const pane of press.closest('[data-views]').querySelectorAll('[data-pane]')) pane.hidden = pane.dataset.pane !== view
    }
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
  const start = () => {
    const iframe = document.createElement('iframe')
    iframe.src = frame.dataset.src
    iframe.title = 'PR Sift live demo'
    iframe.allow = 'clipboard-write'
    iframe.className = 'absolute inset-0 size-full border-0 bg-paper opacity-0 transition-opacity duration-300'
    const reveal = () => iframe.classList.remove('opacity-0')
    // The stand-in GitHub page and the review's loading state show for a moment first, so the frame waits for the files.
    const reviewShown = () => Boolean(iframe.contentDocument.getElementById('pr-sift-host')?.shadowRoot?.querySelector('main [data-file]'))
    iframe.addEventListener(
      'load',
      () => {
        passScroll(iframe.contentWindow)
        const started = performance.now()
        const wait = () => (reviewShown() || performance.now() - started > 4000 ? reveal() : setTimeout(wait, 50))
        wait()
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
