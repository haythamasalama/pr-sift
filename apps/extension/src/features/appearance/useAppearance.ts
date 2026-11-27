import { computed, shallowRef } from 'vue'
import { DEFAULTS, getSettings, onSettingsChange, saveSetting } from '../../lib/settings'
import { installFonts } from '../../lib/fonts'
import type { Settings, ThemeMode, ThemeStyle } from '../../lib/types'

export const THEME_STYLES: { value: ThemeStyle; label: string; hint: string }[] = [
  { value: 'prsift', label: 'PR Sift', hint: 'Like the PR Sift website: black and white, IBM Plex and thin lines' },
  { value: 'github', label: 'GitHub', hint: 'Like github.com: GitHub blue and the system font' },
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

// Sizes snap to stops, as in macOS and Figma, so text never lands on a blurry half pixel.
export const UI_SCALES = [80, 90, 100, 110, 125, 150]
export const CODE_SIZES = [11, 12, 13, 14, 15, 16, 18]
const nearest = (list: number[], value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? list.reduce((best, x) => (Math.abs(x - value) < Math.abs(best - value) ? x : best), list[0]!)
    : fallback
// The next stop up or down from `value`, or the same one at either end.
export const stepStop = (list: number[], value: number, by: -1 | 1) =>
  list[Math.min(list.length - 1, Math.max(0, list.indexOf(nearest(list, value, value)) + by))]!

export const codeFor = (theme: string, dark: boolean) => `${theme}-${dark ? 'dark' : 'light'}`

const theme = shallowRef<ThemeMode>(DEFAULTS.theme)
const themeStyle = shallowRef<ThemeStyle>(DEFAULTS.themeStyle)
const codeTheme = shallowRef(DEFAULTS.codeTheme)
const uiScale = shallowRef(DEFAULTS.uiScale)
const codeSize = shallowRef(DEFAULTS.codeSize)
const systemDark = shallowRef(false)
let started = false

const pick = <T extends string>(value: string | undefined, options: { value: T }[], fallback: T): T =>
  options.find((o) => o.value === value)?.value ?? fallback

function apply(settings: Partial<Settings>) {
  theme.value = settings.theme ?? DEFAULTS.theme
  themeStyle.value = pick(RENAMED[settings.themeStyle ?? ''] ?? settings.themeStyle, THEME_STYLES, DEFAULTS.themeStyle)
  codeTheme.value = pick(settings.codeTheme, CODE_THEMES, DEFAULTS.codeTheme)
  uiScale.value = nearest(UI_SCALES, settings.uiScale, DEFAULTS.uiScale)
  codeSize.value = nearest(CODE_SIZES, settings.codeSize, DEFAULTS.codeSize)
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

export function themeAttrs(style: ThemeStyle, code = '', codePx = DEFAULTS.codeSize) {
  return { 'data-style': style, 'data-code': code || undefined, style: { '--ps-code-size': `${codePx}px` } }
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
    rootAttrs: computed(() => themeAttrs(themeStyle.value, codeFor(codeTheme.value, dark.value), codeSize.value)),
    uiScale,
    codeSize,
    // In the browser the interface size scales PR Sift's own panels; the desktop app zooms its window instead.
    zoomStyle: computed(() => (uiScale.value === 100 ? undefined : { zoom: uiScale.value / 100 })),
    setUiScale: (value: number) => {
      uiScale.value = nearest(UI_SCALES, value, DEFAULTS.uiScale)
      return saveSetting('uiScale', uiScale.value)
    },
    setCodeSize: (value: number) => {
      codeSize.value = nearest(CODE_SIZES, value, DEFAULTS.codeSize)
      return saveSetting('codeSize', codeSize.value)
    },
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
