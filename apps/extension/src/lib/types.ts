export * from '@pr-sift/core'

import type { MergeMethod } from '@pr-sift/core'

export type DiffMode = 'unified' | 'split'

export type ExtState = 'include' | 'exclude'

export interface ExtChip {
  ext: string
  label: string
  count: number
  state?: ExtState
  custom: boolean
}

export interface Preset {
  name: string
  include: string[]
  includeHidden?: boolean
}

export type ThemeMode = 'system' | 'light' | 'dark'

export type ThemeStyle = 'prsift' | 'github' | 'vega' | 'nova' | 'maia' | 'lyra' | 'mira'

export type BaseColor = 'neutral' | 'stone' | 'zinc' | 'gray' | 'mauve' | 'olive' | 'mist' | 'taupe'

export interface Settings {
  presets: Preset[]
  hide: string[]
  hideStatuses: string[]
  customExtensions: string[]
  hiddenTypes: string[]
  reviewMode: boolean
  autoOpen: boolean
  diffView: DiffMode
  sidebarWidth: number
  theme: ThemeMode
  themeStyle: ThemeStyle
  baseColor: BaseColor
  codeLight: string
  codeDark: string
  treeIndent: number
  treeGuides: boolean
  mergeMethod: MergeMethod
  leaveOutCoAuthors: boolean
  removedCoAuthors: string[]
  keptCoAuthors: string[]
  showResolved: boolean
  sidebarCollapsed: boolean
  assistant: 'claude-code' | 'codex' | 'cursor' | 'copilot' | 'claude' | 'chatgpt' | 'clipboard'
}
