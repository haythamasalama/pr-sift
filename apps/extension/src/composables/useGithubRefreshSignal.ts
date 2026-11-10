import { onBeforeUnmount, onMounted, shallowRef } from 'vue'

const LABEL = /^refresh$/i
const SCAN_INTERVAL_MS = 5000

function findRefreshControl(): boolean {
  for (const el of document.querySelectorAll('button, [role="button"], a')) {
    if (el.childElementCount > 3) continue
    if (!LABEL.test((el.textContent ?? '').trim())) continue
    if (el.getClientRects().length > 0) return true
  }
  return false
}

export function useGithubRefreshSignal() {
  const present = shallowRef(false)
  let timer = 0

  const scan = () => {
    if (!document.hidden) present.value = findRefreshControl()
  }

  onMounted(() => {
    scan()
    timer = window.setInterval(scan, SCAN_INTERVAL_MS)
    document.addEventListener('visibilitychange', scan)
  })

  onBeforeUnmount(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', scan)
  })

  return present
}
