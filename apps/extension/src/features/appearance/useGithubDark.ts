import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useAppearance } from './useAppearance'

export const githubIsDark = (colorMode: string | undefined, systemDark: boolean) =>
  colorMode === 'dark' || (colorMode === 'auto' && systemDark)

export function isDarkColor(color: string): boolean | null {
  const m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?/.exec(color)
  if (!m || Number(m[4] ?? 1) === 0) return null
  return 0.299 * Number(m[1]) + 0.587 * Number(m[2]) + 0.114 * Number(m[3]) < 128
}

// The launcher sits on GitHub's page, so it follows the page's real background rather than PR Sift's own theme.
export function useGithubDark() {
  const { systemDark } = useAppearance()
  const version = shallowRef(0)
  const bump = () => version.value++
  const observer = new MutationObserver(bump)

  onMounted(() => {
    observer.observe(document.documentElement, { attributes: true })
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] })
  })
  onBeforeUnmount(() => observer.disconnect())

  return computed(() => {
    void version.value
    const fromBackground =
      isDarkColor(getComputedStyle(document.body).backgroundColor) ??
      isDarkColor(getComputedStyle(document.documentElement).backgroundColor)
    return fromBackground ?? githubIsDark(document.documentElement.dataset.colorMode, systemDark.value)
  })
}
