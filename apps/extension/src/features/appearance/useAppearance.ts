import { computed, shallowRef } from 'vue'
import { DEFAULTS, getSettings, onSettingsChange, saveSetting } from '../../lib/settings'
import type { Settings, ThemeMode } from '../../lib/types'

const theme = shallowRef<ThemeMode>(DEFAULTS.theme)
const systemDark = shallowRef(false)
let started = false

function apply(settings: Partial<Settings>) {
  theme.value = settings.theme ?? DEFAULTS.theme
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
    systemDark,
    dark: computed(() => isDark(theme.value, systemDark.value)),
    setTheme: (value: ThemeMode) => {
      theme.value = value
      return saveSetting('theme', value)
    },
  }
}
