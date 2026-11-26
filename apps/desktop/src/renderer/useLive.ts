import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { bridge } from './bridge'

// Keeps lists current without a Refresh button: they look again when you change something on GitHub from the app,
// when you come back to the window, and every so often while it is open. A hidden window asks nothing.
export const LIVE = {
  // A list older than this is asked again when you open it or come back to the window.
  staleMs: 30_000,
  // How often an open, visible list looks again on its own.
  everyMs: 90_000,
  // GitHub's search takes a few seconds to see a new review, so a change is looked at twice.
  afterChangeMs: [1_500, 8_000],
}

// When this app last changed something on GitHub.
const changedAt = shallowRef(0)
bridge.on('github:changed', ({ at }) => (changedAt.value = at))

const visible = () => document.visibilityState === 'visible'

// True when a list loaded at `at` is older than a change made from the app, or than LIVE.staleMs.
export function isStale(at: number | null | undefined, now = Date.now()) {
  return !at || at < changedAt.value || now - at > LIVE.staleMs
}

// Calls `load` when the list it feeds is out of date. `loadedAt` is when that list last came from GitHub.
export function useLive(load: () => unknown, loadedAt: () => number | null | undefined) {
  const timers: ReturnType<typeof setTimeout>[] = []
  let every: ReturnType<typeof setInterval> | undefined

  const refreshIfStale = () => visible() && isStale(loadedAt()) && void load()
  const onChange = () => {
    for (const ms of LIVE.afterChangeMs) timers.push(setTimeout(() => visible() && void load(), ms))
  }

  let off: (() => void) | undefined
  onMounted(() => {
    refreshIfStale()
    off = bridge.on('github:changed', onChange)
    document.addEventListener('visibilitychange', refreshIfStale)
    window.addEventListener('focus', refreshIfStale)
    every = setInterval(() => visible() && void load(), LIVE.everyMs)
  })
  onBeforeUnmount(() => {
    off?.()
    document.removeEventListener('visibilitychange', refreshIfStale)
    window.removeEventListener('focus', refreshIfStale)
    clearInterval(every)
    for (const t of timers) clearTimeout(t)
  })
}
