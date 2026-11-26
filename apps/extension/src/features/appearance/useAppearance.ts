import { computed, shallowRef } from 'vue'
import { DEFAULTS, getSettings, onSettingsChange, saveSetting } from '../../lib/settings'
import type { Settings, ThemeMode, ThemeStyle } from '../../lib/types'

export const THEME_STYLES: { value: ThemeStyle; label: string; hint: string }[] = [
  { value: 'github', label: 'GitHub', hint: 'Primer colours and tight corners, like github.com' },
  { value: 'shadcn', label: 'shadcn/vue', hint: 'Neutral greys and soft corners, like shadcn/vue' },
]

const theme = shallowRef<ThemeMode>(DEFAULTS.theme)
const themeStyle = shallowRef<ThemeStyle>(DEFAULTS.themeStyle)
const systemDark = shallowRef(false)
let started = false

function apply(settings: Partial<Settings>) {
  theme.value = settings.theme ?? DEFAULTS.theme
  const style = settings.themeStyle ?? DEFAULTS.themeStyle
  themeStyle.value = THEME_STYLES.some((s) => s.value === style) ? style : DEFAULTS.themeStyle
}

function start() {
  started = true
  if (typeof matchMedia === 'function') {
    const media = matchMedia('(prefers-color-scheme: dark)')
    systemDark.value = media.matches
    media.addEventListener('change', (e) => (systemDark.value = e.matches))
  }
  getSettings().then(apply, () => {})
  onSettingsChange(apply)
}

export const isDark = (mode: ThemeMode, system: boolean) => (mode === 'system' ? system : mode === 'dark')

export function useAppearance() {
  if (!started) start()
  return {
    theme,
    themeStyle,
    systemDark,
    dark: computed(() => isDark(theme.value, systemDark.value)),
    setTheme: (value: ThemeMode) => {
      theme.value = value
      return saveSetting('theme', value)
    },
    setThemeStyle: (value: ThemeStyle) => {
      themeStyle.value = value
      return saveSetting('themeStyle', value)
    },
  }
}
