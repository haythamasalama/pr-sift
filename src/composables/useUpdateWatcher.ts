import { onScopeDispose, shallowRef } from 'vue'

export function useUpdateWatcher(check: () => Promise<boolean>, intervalMs = 90_000) {
  const available = shallowRef(false)
  let busy = false

  async function tick() {
    if (busy || available.value || document.hidden) return
    busy = true
    try {
      if (await check()) available.value = true
    } finally {
      busy = false
    }
  }

  const onVisible = () => {
    if (!document.hidden) void tick()
  }
  const timer = window.setInterval(tick, intervalMs)
  document.addEventListener('visibilitychange', onVisible)
  onScopeDispose(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
  })

  return { available, dismiss: () => (available.value = false) }
}
