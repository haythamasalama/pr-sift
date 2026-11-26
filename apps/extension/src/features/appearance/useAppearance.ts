import { computed, shallowRef } from 'vue'
import { DEFAULTS, getSettings, onSettingsChange, saveSetting } from '../../lib/settings'
import { installFonts } from '../../lib/fonts'
import type { Settings, ThemeMode, ThemeStyle } from '../../lib/types'

export const THEME_STYLES: { value: ThemeStyle; label: string; hint: string }[] = [
  { value: 'github', label: 'GitHub', hint: 'Like github.com: GitHub blue and the system font' },
  { value: 'prsift', label: 'PR Sift', hint: 'Like the PR Sift website: black and white, IBM Plex and thin lines' },
  { value: 'minimal', label: 'Minimal', hint: 'Neutral greys and soft corners' },
  { value: 'soft', label: 'Soft', hint: 'Warm greys and round corners' },
  { value: 'mono', label: 'Mono', hint: 'Square corners and a monospace font' },
]

// Names used by earlier test builds, mapped to the theme that replaced them.
const RENAMED: Record<string, ThemeStyle> = {
  shadcn: 'minimal',
  vega: 'minimal',
  nova: 'minimal',
  mira: 'minimal',
  maia: 'soft',
  lyra: 'mono',
}

export const CODE_THEMES = [
  { value: 'github', label: 'GitHub' },
  { value: 'one', label: 'One' },
  { value: 'catppuccin', label: 'Catppuccin' },
  { value: 'gruvbox', label: 'Gruvbox' },
  { value: 'solarized', label: 'Solarized' },
  { value: 'tokyo-night', label: 'Tokyo Night' },
  { value: 'night-owl', label: 'Night Owl' },
]

export const codeFor = (theme: string, dark: boolean) => `${theme}-${dark ? 'dark' : 'light'}`

const theme = shallowRef<ThemeMode>(DEFAULTS.theme)
const themeStyle = shallowRef<ThemeStyle>(DEFAULTS.themeStyle)
const codeTheme = shallowRef(DEFAULTS.codeTheme)
const systemDark = shallowRef(false)
let started = false

const pick = <T extends string>(value: string | undefined, options: { value: T }[], fallback: T): T =>
  options.find((o) => o.value === value)?.value ?? fallback

function apply(settings: Partial<Settings>) {
  theme.value = settings.theme ?? DEFAULTS.theme
  themeStyle.value = pick(RENAMED[settings.themeStyle ?? ''] ?? settings.themeStyle, THEME_STYLES, DEFAULTS.themeStyle)
  codeTheme.value = pick(settings.codeTheme, CODE_THEMES, DEFAULTS.codeTheme)
  // Only the PR Sift theme uses the bundled IBM Plex fonts, so other themes skip decoding them.
  if (themeStyle.value === 'prsift') installFonts()
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

export function themeAttrs(style: ThemeStyle, code = '') {
  return { 'data-style': style, 'data-code': code || undefined }
}

export function useAppearance() {
  if (!started) start()
  const dark = computed(() => isDark(theme.value, systemDark.value))
  return {
    theme,
    themeStyle,
    codeTheme,
    systemDark,
    dark,
    // Bind on every .ps-root so the chosen theme and code colours reach it.
    rootAttrs: computed(() => themeAttrs(themeStyle.value, codeFor(codeTheme.value, dark.value))),
    setTheme: (value: ThemeMode) => {
      theme.value = value
      return saveSetting('theme', value)
    },
    setThemeStyle: (value: ThemeStyle) => {
      themeStyle.value = value
      if (value === 'prsift') installFonts()
      return saveSetting('themeStyle', value)
    },
    setCodeTheme: (value: string) => {
      codeTheme.value = value
      return saveSetting('codeTheme', value)
    },
  }
}
