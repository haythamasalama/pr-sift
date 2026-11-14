import { computed, shallowRef } from 'vue'
import { DEFAULTS, getSettings, onSettingsChange, saveSetting } from '../../lib/settings'
import type { GlowMode, Settings, ThemeMode } from '../../lib/types'

const theme = shallowRef<ThemeMode>(DEFAULTS.theme)
const glow = shallowRef<GlowMode>(DEFAULTS.launcherGlow)
const systemDark = shallowRef(false)
let started = false

function apply(settings: Partial<Settings>) {
  theme.value = settings.theme ?? DEFAULTS.theme
  glow.value = settings.launcherGlow ?? DEFAULTS.launcherGlow
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
    glow,
    systemDark,
    dark: computed(() => isDark(theme.value, systemDark.value)),
    setTheme: (value: ThemeMode) => {
      theme.value = value
      return saveSetting('theme', value)
    },
    setGlow: (value: GlowMode) => {
      glow.value = value
      return saveSetting('launcherGlow', value)
    },
  }
}
