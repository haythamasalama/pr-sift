export interface PrRef {
  owner: string
  repo: string
  number: number
}

export interface PrFile {
  filename: string
  status: string
  additions: number
  deletions: number
  patch?: string
  hash: string
  blob_url: string
}

export interface PrInfo {
  title: string
}

export type Via = 'session' | 'api'
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
}

export interface DiffRow {
  kind: 'add' | 'del' | 'ctx' | 'hunk' | 'note'
  oldNo: number | ''
  newNo: number | ''
  text: string
}

export interface TreeNode {
  name: string
  path: string
  count: number
  dirs: TreeNode[]
  files: PrFile[]
}

export const prKey = (pr: PrRef | null) => (pr ? `${pr.owner}/${pr.repo}#${pr.number}` : '')

export interface Note {
  id: string
  file: string
  side: 'new' | 'old'
  line: number
  startLine?: number
  lineText: string
  quote: string
  text: string
  createdAt: number
  postedUrl?: string
  resolved?: boolean
}
