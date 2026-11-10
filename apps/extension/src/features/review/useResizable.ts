import { shallowRef } from 'vue'

export function useResizable(initial: number, min: number, max: number, onCommit: (width: number) => void) {
  const width = shallowRef(initial)
  const dragging = shallowRef(false)

  const clamp = (value: number) => Math.min(max, Math.max(min, value))

  function start(event: PointerEvent) {
    const handle = event.currentTarget as HTMLElement
    const startX = event.clientX
    const startWidth = width.value
    dragging.value = true
    handle.setPointerCapture(event.pointerId)

    const move = (e: PointerEvent) => {
      width.value = clamp(startWidth + e.clientX - startX)
    }
    const stop = () => {
      dragging.value = false
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', stop)
      handle.removeEventListener('pointercancel', stop)
      onCommit(width.value)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', stop)
    handle.addEventListener('pointercancel', stop)
  }

  function set(value: number) {
    width.value = clamp(value)
  }

  return { width, dragging, start, set }
}
