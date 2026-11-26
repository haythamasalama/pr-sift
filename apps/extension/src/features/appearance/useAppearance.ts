import { computed, shallowRef } from 'vue'
import { DEFAULTS, getSettings, onSettingsChange, saveSetting } from '../../lib/settings'
import type { BaseColor, Settings, ThemeMode, ThemeStyle } from '../../lib/types'

export const THEME_STYLES: { value: ThemeStyle; label: string; hint: string; family?: 'shadcn' }[] = [
  { value: 'prsift', label: 'PR Sift', hint: 'Our own look: GitHub colours with a calm neutral accent' },
  { value: 'github', label: 'GitHub', hint: 'Primer colours, GitHub blue and the system font, like github.com' },
  { value: 'vega', label: 'Vega', hint: 'shadcn/vue: the classic shadcn look', family: 'shadcn' },
  { value: 'nova', label: 'Nova', hint: 'shadcn/vue: Geist font', family: 'shadcn' },
  { value: 'maia', label: 'Maia', hint: 'shadcn/vue: soft and rounded', family: 'shadcn' },
  { value: 'lyra', label: 'Lyra', hint: 'shadcn/vue: boxy and sharp, with a monospace font', family: 'shadcn' },
  { value: 'mira', label: 'Mira', hint: 'shadcn/vue: tighter corners for dense screens', family: 'shadcn' },
]

export const BASE_COLORS: { value: BaseColor; label: string }[] = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'stone', label: 'Stone' },
  { value: 'zinc', label: 'Zinc' },
  { value: 'gray', label: 'Gray' },
  { value: 'mauve', label: 'Mauve' },
  { value: 'olive', label: 'Olive' },
  { value: 'mist', label: 'Mist' },
  { value: 'taupe', label: 'Taupe' },
]

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

export const isShadcnStyle = (style: ThemeStyle) => THEME_STYLES.some((s) => s.value === style && s.family === 'shadcn')

const theme = shallowRef<ThemeMode>(DEFAULTS.theme)
const themeStyle = shallowRef<ThemeStyle>(DEFAULTS.themeStyle)
const baseColor = shallowRef<BaseColor>(DEFAULTS.baseColor)
const codeTheme = shallowRef(DEFAULTS.codeTheme)
const systemDark = shallowRef(false)
let started = false

const pick = <T extends string>(value: string | undefined, options: { value: T }[], fallback: T): T =>
  options.find((o) => o.value === value)?.value ?? fallback

function apply(settings: Partial<Settings>) {
  theme.value = settings.theme ?? DEFAULTS.theme
  // The first build called the shadcn style "shadcn"; it is Vega now.
  const style = (settings.themeStyle as string) === 'shadcn' ? 'vega' : settings.themeStyle
  themeStyle.value = pick(style, THEME_STYLES, DEFAULTS.themeStyle)
  baseColor.value = pick(settings.baseColor, BASE_COLORS, DEFAULTS.baseColor)
  codeTheme.value = pick(settings.codeTheme, CODE_THEMES, DEFAULTS.codeTheme)
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

export function themeAttrs(style: ThemeStyle, base: BaseColor, code: string) {
  return { 'data-style': style, 'data-base': base, 'data-code': code }
}

export function useAppearance() {
  if (!started) start()
  const dark = computed(() => isDark(theme.value, systemDark.value))
  return {
    theme,
    themeStyle,
    baseColor,
    codeTheme,
    systemDark,
    dark,
    // Bind on every .ps-root so the chosen style, base colour and code colours reach it.
    rootAttrs: computed(() => themeAttrs(themeStyle.value, baseColor.value, codeFor(codeTheme.value, dark.value))),
    setTheme: (value: ThemeMode) => {
      theme.value = value
      return saveSetting('theme', value)
    },
    setThemeStyle: (value: ThemeStyle) => {
      themeStyle.value = value
      return saveSetting('themeStyle', value)
    },
    setBaseColor: (value: BaseColor) => {
      baseColor.value = value
      return saveSetting('baseColor', value)
    },
    setCodeTheme: (value: string) => {
      codeTheme.value = value
      return saveSetting('codeTheme', value)
    },
  }
}
