// The contract between the main process and the window. Every channel the preload allows is listed here.
import type { PullLink } from './links'

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
  // Paths read from the project folder down by default; this shows the whole absolute path instead.
  fullPaths: boolean
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
  // Its branch is already in the default branch.
  merged?: boolean
}

export interface RemovedWorktree {
  repo: string
  path: string
  branch?: string
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
  // The project's own favicon or logo, as a data URL.
  icon?: string
}

export interface ProjectOverview {
  stack: string[]
  description?: string
  packageManager?: string
  // The first paragraph of the README.
  readme?: string
  commits?: number
  firstCommit?: number
  lastCommit?: { at: number; subject: string; author: string }
  contributors?: number
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
  // Who made the last commit, and whether that was you (by your git email).
  author?: string
  // Their email in git, used to find their GitHub photo.
  email?: string
  mine?: boolean
  // The repository's main branch (its default branch on GitHub): listed first, never deleted.
  protected?: boolean
}

export interface BulkDeleteResult {
  deleted: string[]
  // Branches whose copy on GitHub was deleted too.
  remoteDeleted: string[]
  failed: { name: string; error: string }[]
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
  // GitHub login-like handle from the author's email when it is a GitHub noreply address, for the avatar.
  email?: string
}

// One changed file in a worktree, shaped like GitHub's pull request files so the review's diff cards can show it.
export interface PatchFile {
  filename: string
  previous?: string
  status: 'added' | 'modified' | 'removed' | 'renamed'
  additions: number
  deletions: number
  patch?: string
  hash: string
}

export type PatchMode = 'uncommitted' | 'branch' | 'commit'

export interface WorktreePatch {
  repo: string
  worktree: Worktree
  github?: { owner: string; repo: string }
  // The branch the worktree's branch started from, which `branch` mode compares with.
  base?: string
  mode: PatchMode
  // In commit mode, the commit shown.
  commit?: Commit
  files: PatchFile[]
  // How many files the uncommitted and branch modes show, for the counts beside the toggle.
  counts: { uncommitted: number; branch: number }
  // The branch's own commits, newest first: since it left its base, or the latest ones for the main folder.
  commits: Commit[]
  truncated: boolean
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

// Auto-approve: rules that approve pull requests waiting for your review when every condition holds.
export interface AutoApproveRule {
  id: string
  name: string
  enabled: boolean
  // `owner/repo` or `owner/*`. Empty means every repository.
  repos: string[]
  // Logins; bots are written like `dependabot[bot]`. Empty means anyone.
  authors: string[]
  excludeAuthors: string[]
  // Every changed file must match one of these globs. Empty means any file.
  paths: string[]
  // No changed file may match any of these globs.
  blockedPaths: string[]
  // At least one of these labels. Empty means no label is needed.
  labels: string[]
  blockedLabels: string[]
  // Case-insensitive words; the title must contain one. Empty means any title.
  titleWords: string[]
  // Base branches the pull request may target. Empty means any.
  baseBranches: string[]
  maxFiles: number | null
  // Additions plus deletions.
  maxLines: number | null
  requireChecks: boolean
  requireMergeable: boolean
  // Skip while someone else has asked for changes.
  skipChangesRequested: boolean
  // Wait this long after the last push, so the author can still fix things first.
  minAgeMinutes: number
  comment: string
}

export interface AutoApproveConfig {
  enabled: boolean
  // While true, nothing is approved: the log says what would have been.
  dryRun: boolean
  intervalMinutes: number
  rules: AutoApproveRule[]
}

export interface PullFacts {
  owner: string
  repo: string
  number: number
  title: string
  url: string
  author: string
  draft: boolean
  base: string
  headSha: string
  // When the last commit was pushed, or the pull request updated if unknown.
  pushedAt: number
  labels: string[]
  files: string[]
  // Total changed files; can be more than `files` when GitHub caps the list.
  changedFiles: number
  additions: number
  deletions: number
  checks?: 'SUCCESS' | 'FAILURE' | 'ERROR' | 'PENDING' | 'EXPECTED'
  mergeable?: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN'
  changesRequested: boolean
  // The commit you last approved, if any.
  myApprovedSha?: string
}

export interface RuleCheck {
  rule: string
  ruleId: string
  // Every condition that failed; empty when the rule matches.
  failed: string[]
}

export interface Evaluation {
  pull: Pick<PullFacts, 'owner' | 'repo' | 'number' | 'title' | 'url' | 'author' | 'headSha'> & Partial<Pick<PullFacts, 'changedFiles'>>
  // The first enabled rule that matched, if any.
  matched?: string
  checks: RuleCheck[]
  // Why no rule was looked at, such as a draft.
  blocked?: string
}

export type AutoApproveAction = 'approved' | 'would-approve' | 'failed'

export interface AutoApproveLogEntry {
  id: string
  at: number
  action: AutoApproveAction
  rule: string
  pull: Evaluation['pull']
  error?: string
}

export interface AutoApproveStatus {
  config: AutoApproveConfig
  lastRun?: number
  nextRun?: number
  running: boolean
  lastError?: string
  log: AutoApproveLogEntry[]
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
  'worktrees:remove': { args: [path: string]; result: RemovedWorktree }
  'worktrees:prune': { args: [repo: string]; result: Repo }
  'projects:list': { args: []; result: Project[] }
  'projects:candidates': { args: []; result: string[] }
  'projects:browse': { args: []; result: string[] | null }
  'projects:add': { args: [paths: string[]]; result: Project[] }
  'projects:remove': { args: [path: string]; result: Project[] }
  'projects:overview': { args: [path: string]; result: ProjectOverview }
  'worktrees:list': { args: [repo: string]; result: Repo }
  'worktrees:changes': { args: [path: string]; result: WorktreeChanges }
  'worktrees:diff': { args: [path: string, file: string]; result: string }
  'worktrees:patch': { args: [path: string, mode: PatchMode, commit?: string]; result: WorktreePatch }
  'worktrees:discard': { args: [path: string, file: string]; result: void }
  'worktrees:add': { args: [repo: string, branch: string]; result: Repo }
  'worktrees:rename': { args: [path: string, name: string]; result: Repo }
  'worktrees:rename-branch': { args: [path: string, name: string]; result: Repo }
  'worktrees:open': { args: [path: string, target: OpenTarget]; result: OpenResult }
  'branches:list': { args: [repo: string]; result: Branch[] }
  'branches:delete': { args: [repo: string, name: string, force: boolean]; result: { ok: boolean; error?: string } }
  'leftovers:scan': { args: [root?: string]; result: Leftover[] }
  'leftovers:size': { args: [path: string]; result: number }
  'leftovers:trash': { args: [paths: string[]]; result: TrashResult }
  'branches:delete-many': {
    args: [repo: string, names: string[], options: { force: boolean; remote: boolean }]
    result: BulkDeleteResult
  }
  'autoapprove:status': { args: []; result: AutoApproveStatus }
  'autoapprove:save': { args: [config: AutoApproveConfig]; result: AutoApproveStatus }
  // With a config, checks that one (an unsaved draft) instead of the saved rules. `refresh` asks GitHub again.
  'autoapprove:preview': { args: [config?: AutoApproveConfig, refresh?: boolean]; result: Evaluation[] }
  'autoapprove:run': { args: []; result: AutoApproveStatus }
  'autoapprove:clear-log': { args: []; result: AutoApproveStatus }
  'shell:reveal': { args: [path: string]; result: void }
  'shell:open-external': { args: [url: string]; result: void }
  // The window frame (title bar, traffic lights) follows the app's own Light / Dark / System choice.
  'window:appearance': { args: [mode: 'system' | 'light' | 'dark', background: string]; result: void }
  'window:zoom': { args: [percent: number]; result: void }
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
  'worktrees:prune',
  'projects:list',
  'projects:candidates',
  'projects:browse',
  'projects:add',
  'projects:remove',
  'projects:overview',
  'worktrees:list',
  'worktrees:changes',
  'worktrees:diff',
  'worktrees:patch',
  'worktrees:discard',
  'worktrees:add',
  'worktrees:rename',
  'worktrees:rename-branch',
  'worktrees:open',
  'branches:list',
  'branches:delete',
  'leftovers:scan',
  'leftovers:size',
  'leftovers:trash',
  'branches:delete-many',
  'autoapprove:status',
  'autoapprove:save',
  'autoapprove:preview',
  'autoapprove:run',
  'autoapprove:clear-log',
  'shell:reveal',
  'shell:open-external',
  'window:appearance',
  'window:zoom',
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
  'autoapprove:changed': AutoApproveStatus
  // Something was changed on GitHub from this app: a review, a merge, a comment.
  'github:changed': { at: number }
  // A prsift:// link asked to open this pull request.
  'pull:open': PullLink
  // An item in the menu bar was chosen, or its shortcut pressed.
  'menu:command': MenuCommand
}

export type MenuCommand =
  | 'settings'
  | 'account'
  | 'add-project'
  | 'open-link'
  | 'refresh'
  | 'find'
  | 'view:inbox'
  | 'view:autoapprove'
  | 'zoom:in'
  | 'zoom:out'
  | 'zoom:reset'
  | 'view:pulls'
  | 'view:branches'
  | 'view:worktrees'
  | 'view:cleanup'
  | 'toggle-sidebar'
  | 'focus'
  | 'back'
  | 'pull:previous'
  | 'pull:next'
  | 'shortcuts'

export type EventName = keyof Events

export const EVENTS = [
  'store:changed',
  'auth:changed',
  'navigate',
  'projects:changed',
  'autoapprove:changed',
  'github:changed',
  'pull:open',
  'menu:command',
] as const satisfies readonly EventName[]

export interface Bridge {
  invoke<C extends Channel>(channel: C, ...args: Channels[C]['args']): Promise<Channels[C]['result']>
  on<E extends EventName>(event: E, listener: (payload: Events[E]) => void): () => void
}
