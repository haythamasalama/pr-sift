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

for (const root of document.querySelectorAll('[data-playground]')) {
  const chips = [...root.querySelectorAll('[data-chip]')]
  const files = [...root.querySelectorAll('[data-file]')]
  const summary = root.querySelector('[data-summary]')
  const hint = summary.textContent
  const state = new Map()

  const matches = (file, key) => (key.startsWith('status:') ? file.dataset.status === key.slice(7) : file.dataset.type === key)

  function render() {
    const shown = [...state].filter(([, s]) => s === 'include').map(([k]) => k)
    const hidden = [...state].filter(([, s]) => s === 'exclude').map(([k]) => k)
    const groups = [shown.filter((k) => !k.startsWith('status:')), shown.filter((k) => k.startsWith('status:'))].filter((g) => g.length)
    let visible = 0
    for (const file of files) {
      const show = !hidden.some((k) => matches(file, k)) && groups.every((g) => g.some((k) => matches(file, k)))
      file.classList.toggle('is-hidden', !show)
      if (show) visible++
    }
    for (const chip of chips) chip.dataset.state = state.get(chip.dataset.chip) ?? ''
    summary.textContent = state.size ? `${visible} of ${files.length} files` : hint
  }

  let playing = root.hasAttribute('data-autoplay') && !matchMedia('(prefers-reduced-motion: reduce)').matches
  const stop = () => (playing = false)
  root.addEventListener('pointerdown', stop, { capture: true })
  root.addEventListener('keydown', stop, { capture: true })

  const press = (key, hide = false) => {
    const chip = chips.find((c) => c.dataset.chip === key)
    chip.classList.add('is-pressing')
    setTimeout(() => chip.classList.remove('is-pressing'), 160)
    if (hide) state.set(key, 'exclude')
    else state.set(key, 'include')
    render()
  }

  const SCRIPT = [
    [1200, () => press('.lock', true)],
    [1500, () => press('.md', true)],
    [1500, () => press('.php')],
    [1500, () => press('status:added')],
    [3200, () => (state.clear(), render())],
  ]

  async function loop() {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms))
    while (playing) {
      for (const [delay, step] of SCRIPT) {
        await wait(delay)
        if (!playing) return
        step()
      }
    }
  }
  if (playing) {
    const seen = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        seen.disconnect()
        loop()
      }
    })
    seen.observe(root)
  }

  for (const chip of chips) {
    const key = chip.dataset.chip
    const toggle = (hide) => {
      const current = state.get(key)
      const next = hide ? (current === 'exclude' ? null : 'exclude') : current ? null : 'include'
      if (next) state.set(key, next)
      else state.delete(key)
      render()
    }
    chip.addEventListener('click', (e) => toggle(e.shiftKey || e.altKey || e.metaKey || e.ctrlKey))
    chip.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      toggle(true)
    })
  }
  root.querySelector('[data-reset]').addEventListener('click', () => {
    state.clear()
    render()
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
  const video = demo.querySelector('[data-demo-video]')
  const select = (tab) => {
    for (const other of tabs) other.setAttribute('aria-selected', String(other === tab))
    const name = tab.dataset.video
    video.poster = video.poster.replace(/[^/]+\.jpg$/, `${name}.jpg`)
    const source = video.querySelector('source')
    source.src = source.src.replace(/[^/]+\.mp4$/, `${name}.mp4`)
    video.setAttribute('aria-label', tab.textContent.trim())
    video.load()
    if (!reducedMotion) video.play().catch(() => undefined)
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

fetch('https://api.github.com/repos/haythamasalama/pr-sift')
  .then((res) => (res.ok ? res.json() : null))
  .then((repo) => {
    if (!repo?.stargazers_count) return
    document.querySelectorAll('[data-stars]').forEach((el) => (el.textContent = String(repo.stargazers_count)))
  })
  .catch(() => undefined)
