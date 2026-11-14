import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useAppearance } from './useAppearance'

export const githubIsDark = (colorMode: string | undefined, systemDark: boolean) =>
  colorMode === 'dark' || (colorMode === 'auto' && systemDark)

// The launcher sits on GitHub's page, so it follows GitHub's theme rather than PR Sift's own setting.
export function useGithubDark() {
  const { systemDark } = useAppearance()
  const colorMode = shallowRef<string | undefined>()
  const root = document.documentElement
  const read = () => (colorMode.value = root.dataset.colorMode)
  const observer = new MutationObserver(read)

  onMounted(() => {
    read()
    observer.observe(root, { attributes: true, attributeFilter: ['data-color-mode'] })
  })
  onBeforeUnmount(() => observer.disconnect())

  return computed(() => githubIsDark(colorMode.value, systemDark.value))
}
