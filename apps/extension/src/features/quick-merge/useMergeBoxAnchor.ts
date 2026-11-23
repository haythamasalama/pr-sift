import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { createShadowHost } from '../../lib/shadow'
import { findMergeButton } from './mergeBox'

// One host for the component's whole life: GitHub re-renders its merge box often, and moving the same host back keeps
// the teleported button and its state.
export function useMergeBoxAnchor(css: string) {
  const { host, target } = createShadowHost('span', css)
  host.dataset.prSift = 'quick-merge'
  host.style.cssText =
    'display:inline-flex;align-items:center;align-self:center;flex-shrink:0;vertical-align:middle;margin-inline-start:8px'

  const found = shallowRef(false)
  const enabled = shallowRef(false)
  let frame = 0

  const place = () => {
    frame = 0
    const match = findMergeButton()
    found.value = Boolean(match)
    enabled.value = Boolean(match && !match.disabled)
    if (!match) host.remove()
    else if (match.anchor.nextSibling !== host) match.anchor.after(host)
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(place)
  }
  const observer = new MutationObserver(schedule)

  onMounted(() => {
    place()
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'hidden'],
    })
  })
  onBeforeUnmount(() => {
    observer.disconnect()
    cancelAnimationFrame(frame)
    host.remove()
  })

  return { target, found, enabled }
}
