import { shallowRef } from 'vue'

// Reorders a vertical list by dragging, with the pointer rather than the browser's drag and drop, so the cursor,
// the lifted row and the rows making room all look the way a sortable list should. Rows may differ in height.
export function reorder(order: string[], id: string, index: number): string[] {
  const rest = order.filter((x) => x !== id)
  rest.splice(Math.max(0, Math.min(index, rest.length)), 0, id)
  return rest
}

// Where the dragged row lands with the pointer at `y`: after every other row whose middle is above the pointer.
// Moving down needs the lower half of the next row, moving up the upper half of the row above, so it never flickers.
export const slotAt = (y: number, middles: number[]) => middles.filter((m) => m < y).length

const THRESHOLD = 4
const EDGE = 28

export function useDragSort(opts: {
  items: () => string[]
  list: () => HTMLElement | null
  onDrop: (order: string[]) => void
  // The data attribute that marks a row this list sorts, so two lists can share one element.
  attr?: string
}) {
  const attr = opts.attr ?? 'sortId'
  const selector = `[data-${attr.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}]`
  // The order while a drag is going on; null otherwise.
  const preview = shallowRef<string[] | null>(null)
  const dragging = shallowRef<string | null>(null)
  let start: { id: string; x: number; y: number } | null = null
  let justDropped = false
  let lastY = 0
  let scroller: number | undefined

  function place(clientY: number) {
    const list = opts.list()
    const order = preview.value
    if (!list || !order || !dragging.value) return
    const id = dragging.value
    // offsetTop ignores the transforms of rows still sliding, so the target doesn't flicker mid-animation.
    const middles = [...list.querySelectorAll<HTMLElement>(selector)]
      .filter((row) => row.dataset[attr] !== id)
      .map((row) => row.offsetTop + row.offsetHeight / 2)
    const y = clientY - list.getBoundingClientRect().top + list.scrollTop
    const next = reorder(order, id, slotAt(y, middles))
    if (next.join('\n') !== order.join('\n')) preview.value = next
  }

  // Near the top or bottom edge of a list that scrolls, it scrolls along.
  function autoScroll() {
    const list = opts.list()
    if (!list || !dragging.value) return
    const rect = list.getBoundingClientRect()
    const step = lastY < rect.top + EDGE ? -6 : lastY > rect.bottom - EDGE ? 6 : 0
    if (step) {
      list.scrollTop += step
      place(lastY)
    }
    scroller = requestAnimationFrame(autoScroll)
  }

  function onMove(e: PointerEvent) {
    if (!start) return
    lastY = e.clientY
    if (!dragging.value) {
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < THRESHOLD) return
      dragging.value = start.id
      preview.value = opts.items()
      document.documentElement.classList.add('ps-grabbing')
      scroller = requestAnimationFrame(autoScroll)
    }
    e.preventDefault()
    place(e.clientY)
  }

  function finish(drop: boolean) {
    if (dragging.value && drop && preview.value) {
      opts.onDrop(preview.value)
      justDropped = true
    }
    start = null
    dragging.value = null
    preview.value = null
    document.documentElement.classList.remove('ps-grabbing')
    if (scroller !== undefined) cancelAnimationFrame(scroller)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('keydown', onKey, true)
  }
  const onUp = () => finish(true)
  function onKey(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !dragging.value) return
    e.stopPropagation()
    finish(false)
  }

  function down(e: PointerEvent, id: string) {
    if (e.button !== 0) return
    justDropped = false
    start = { id, x: e.clientX, y: e.clientY }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('keydown', onKey, true)
  }

  // The click that ends a drag should not also open the row.
  function wasDrag() {
    const was = justDropped
    justDropped = false
    return was
  }

  return { preview, dragging, down, wasDrag }
}
