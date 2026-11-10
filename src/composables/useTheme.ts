import { onScopeDispose, shallowRef } from 'vue'

export function useTheme() {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const compute = () => {
    const mode = document.documentElement.dataset.colorMode
    return mode === 'dark' ? true : mode === 'light' ? false : media.matches
  }
  const dark = shallowRef(compute())
  const update = () => (dark.value = compute())
  const observer = new MutationObserver(update)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-mode'] })
  media.addEventListener('change', update)
  onScopeDispose(() => {
    observer.disconnect()
    media.removeEventListener('change', update)
  })
  return dark
}
