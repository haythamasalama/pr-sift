import './style.css'

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.classList.add('shown')
      observer.unobserve(entry.target)
    }
  },
  { rootMargin: '0px 0px -10% 0px' },
)
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))

document.querySelectorAll('[data-theme-toggle]').forEach((button) =>
  button.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark')
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {
      return
    }
  }),
)

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

fetch('https://api.github.com/repos/haythamasalama/pr-sift')
  .then((res) => (res.ok ? res.json() : null))
  .then((repo) => {
    if (!repo?.stargazers_count) return
    document.querySelectorAll('[data-stars]').forEach((el) => (el.textContent = String(repo.stargazers_count)))
  })
  .catch(() => undefined)
