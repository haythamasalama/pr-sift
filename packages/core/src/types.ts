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
