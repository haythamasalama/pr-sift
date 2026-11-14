import { computed, onBeforeUnmount, shallowRef } from 'vue'
import { useAppearance } from './useAppearance'

export interface GithubTheme {
  mode?: string
  light?: string
  dark?: string
}

// GitHub lets the day theme be a dark one, so the theme name decides, not the mode alone.
export function isGithubDark(theme: GithubTheme, systemDark: boolean): boolean | undefined {
  if (!theme.mode) return undefined
  const night = theme.mode === 'dark' || (theme.mode === 'auto' && systemDark)
  const name = night ? theme.dark : theme.light
  return name ? name.startsWith('dark') : night
}

const read = (): GithubTheme => {
  const { colorMode, lightTheme, darkTheme } = document.documentElement.dataset
  return { mode: colorMode, light: lightTheme, dark: darkTheme }
}

export function useGithubTheme() {
  const { dark, systemDark } = useAppearance()
  const theme = shallowRef(read())
  const observer = new MutationObserver(() => (theme.value = read()))
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-color-mode', 'data-light-theme', 'data-dark-theme'],
  })
  onBeforeUnmount(() => observer.disconnect())
  return computed(() => isGithubDark(theme.value, systemDark.value) ?? dark.value)
}
