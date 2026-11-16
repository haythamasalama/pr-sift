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

export interface Settings {
  presets: Preset[]
  hide: string[]
  hideStatuses: string[]
  customExtensions: string[]
  hiddenTypes: string[]
  reviewMode: boolean
  diffView: DiffMode
  sidebarWidth: number
  theme: ThemeMode
  treeIndent: number
  treeGuides: boolean
  mergeMethod: MergeMethod
  removedCoAuthors: string[]
  assistant: 'claude-code' | 'codex' | 'cursor' | 'copilot' | 'claude' | 'chatgpt' | 'clipboard'
}
