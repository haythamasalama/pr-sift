// The contract between the main process and the window. Every channel the preload allows is listed here.

export interface AppInfo {
  version: string
  platform: NodeJS.Platform
  home: string
}

export interface Account {
  login: string
  name?: string
  avatarUrl?: string
}

export type TokenSource = 'pasted' | 'gh'

export interface AuthStatus {
  signedIn: boolean
  account?: Account
  source?: TokenSource
  // Set when the token works but lacks the `repo` scope, so approving and merging may fail.
  scopeWarning?: string
  // False when the system offers no encrypted storage, so a token can't be saved.
  canStore: boolean
  // True on Linux when the only storage is the basic, unencrypted backend.
  weakStorage: boolean
}

export interface AuthResult {
  ok: boolean
  status?: AuthStatus
  error?: string
}

export interface DesktopSettings {
  roots: string[]
  depth: number
}

export interface Worktree {
  path: string
  head: string
  branch?: string
  detached: boolean
  bare: boolean
  locked: boolean
  lockReason?: string
  prunable: boolean
  main: boolean
}

export interface Repo {
  path: string
  name: string
  worktrees: Worktree[]
  github?: { owner: string; repo: string }
  error?: string
}

export interface WorktreeDetails {
  path: string
  size?: number
  changed?: number
  unpushed?: number
  upstream: boolean
  lastUsed?: number
}

export interface UndoEntry {
  id: string
  repo: string
  path: string
  branch?: string
  removedAt: number
}

export type LeftoverKind = 'dependencies' | 'build' | 'cache' | 'media'

export interface Leftover {
  path: string
  kind: LeftoverKind
  label: string
  rebuild: string
  modified?: number
  // Known up front for files; folders are measured after the scan.
  size?: number
}

export interface TrashResult {
  trashed: string[]
  failed: { path: string; error: string }[]
}

export interface Project {
  path: string
  name: string
  // The GitHub repository behind `origin` (or the first GitHub remote), when there is one.
  github?: { owner: string; repo: string }
  branch?: string
  missing?: boolean
}

export interface Branch {
  name: string
  current: boolean
  // The folder of the worktree that has this branch checked out, when one does.
  worktree?: string
  upstream?: string
  // The upstream branch was deleted on the remote, usually after its pull request merged.
  gone: boolean
  ahead: number
  behind: number
  merged: boolean
  lastCommit: number
  subject: string
}

export interface ChangedFile {
  path: string
  // Two-letter porcelain status, such as ` M`, `A `, `??`.
  status: string
}

export interface Commit {
  sha: string
  subject: string
  author: string
  date: number
}

export interface WorktreeChanges {
  files: ChangedFile[]
  commits: Commit[]
}

export type OpenTarget = 'editor' | 'terminal'

export interface OpenResult {
  ok: boolean
  app?: string
  error?: string
}

export interface ApiRequest {
  type: 'gh'
  path: string
  method?: string
  body?: unknown
  accept?: string
}

export interface ApiResponse {
  ok: boolean
  status: number
  data: unknown
}

export interface Channels {
  'app:info': { args: []; result: AppInfo }
  'auth:status': { args: []; result: AuthStatus }
  'auth:save-token': { args: [token: string]; result: AuthResult }
  'auth:gh-available': { args: []; result: boolean }
  'auth:import-gh': { args: []; result: AuthResult }
  'auth:sign-out': { args: []; result: AuthStatus }
  'store:get': { args: [keys: string[]]; result: Record<string, unknown> }
  'store:set': { args: [values: Record<string, unknown>]; result: void }
  'store:remove': { args: [keys: string[]]; result: void }
  'gh:request': { args: [request: ApiRequest]; result: ApiResponse }
  'settings:get': { args: []; result: DesktopSettings }
  'settings:set': { args: [settings: Partial<DesktopSettings>]; result: DesktopSettings }
  'dialog:pick-folder': { args: []; result: string | null }
  'worktrees:scan': { args: []; result: Repo[] }
  'worktrees:details': { args: [path: string]; result: WorktreeDetails }
  'worktrees:remove': { args: [path: string]; result: UndoEntry }
  'worktrees:undo-list': { args: []; result: UndoEntry[] }
  'worktrees:undo': { args: [id: string]; result: { ok: boolean; error?: string } }
  'worktrees:prune': { args: [repo: string]; result: Repo }
  'projects:list': { args: []; result: Project[] }
  'projects:candidates': { args: []; result: string[] }
  'projects:browse': { args: []; result: string[] | null }
  'projects:add': { args: [paths: string[]]; result: Project[] }
  'projects:remove': { args: [path: string]; result: Project[] }
  'worktrees:list': { args: [repo: string]; result: Repo }
  'worktrees:changes': { args: [path: string]; result: WorktreeChanges }
  'worktrees:diff': { args: [path: string, file: string]; result: string }
  'worktrees:rename': { args: [path: string, name: string]; result: Repo }
  'worktrees:rename-branch': { args: [path: string, name: string]; result: Repo }
  'worktrees:open': { args: [path: string, target: OpenTarget]; result: OpenResult }
  'branches:list': { args: [repo: string]; result: Branch[] }
  'branches:delete': { args: [repo: string, name: string, force: boolean]; result: { ok: boolean; error?: string } }
  'leftovers:scan': { args: [root?: string]; result: Leftover[] }
  'leftovers:size': { args: [path: string]; result: number }
  'leftovers:trash': { args: [paths: string[]]; result: TrashResult }
  'shell:reveal': { args: [path: string]; result: void }
  'shell:open-external': { args: [url: string]; result: void }
}

export type Channel = keyof Channels

export const CHANNELS = [
  'app:info',
  'auth:status',
  'auth:save-token',
  'auth:gh-available',
  'auth:import-gh',
  'auth:sign-out',
  'store:get',
  'store:set',
  'store:remove',
  'gh:request',
  'settings:get',
  'settings:set',
  'dialog:pick-folder',
  'worktrees:scan',
  'worktrees:details',
  'worktrees:remove',
  'worktrees:undo-list',
  'worktrees:undo',
  'worktrees:prune',
  'projects:list',
  'projects:candidates',
  'projects:browse',
  'projects:add',
  'projects:remove',
  'worktrees:list',
  'worktrees:changes',
  'worktrees:diff',
  'worktrees:rename',
  'worktrees:rename-branch',
  'worktrees:open',
  'branches:list',
  'branches:delete',
  'leftovers:scan',
  'leftovers:size',
  'leftovers:trash',
  'shell:reveal',
  'shell:open-external',
] as const satisfies readonly Channel[]

export interface StorageChange {
  oldValue?: unknown
  newValue?: unknown
}

export interface Events {
  'store:changed': Record<string, StorageChange>
  'auth:changed': AuthStatus
  navigate: { view: string; section?: string }
  'projects:changed': Project[]
}

export type EventName = keyof Events

export const EVENTS = ['store:changed', 'auth:changed', 'navigate', 'projects:changed'] as const satisfies readonly EventName[]

export interface Bridge {
  invoke<C extends Channel>(channel: C, ...args: Channels[C]['args']): Promise<Channels[C]['result']>
  on<E extends EventName>(event: E, listener: (payload: Events[E]) => void): () => void
}
