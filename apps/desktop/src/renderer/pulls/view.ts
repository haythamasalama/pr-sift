import { shallowRef } from 'vue'

// Which details pull request rows show, and how roomy they are. A per-computer preference shared by every list,
// kept in local storage. People pick what they need from the View menu.
export type PullDetail = 'labels' | 'author' | 'branch' | 'time' | 'size' | 'comments' | 'ci' | 'review'
export type PullDensity = 'comfortable' | 'compact'
// Lists that mix repositories group by owner or repository; a project's list, all one repository, by author.
export type PullGrouping = 'none' | 'owner' | 'repo' | 'author'
// `all` is the All pull requests page, which starts grouped by repository.
export type PullScope = 'everywhere' | 'project' | 'all'

export const PULL_GROUPINGS: Record<PullScope, { value: PullGrouping; label: string; hint: string }[]> = {
  everywhere: [
    { value: 'none', label: 'None', hint: 'One list. Each row says where it lives.' },
    { value: 'owner', label: 'Owner', hint: 'One group per organization or person, biggest first.' },
    { value: 'repo', label: 'Repository', hint: 'One group per repository, biggest first.' },
  ],
  all: [
    { value: 'none', label: 'None', hint: 'One list. Each row says where it lives.' },
    { value: 'owner', label: 'Owner', hint: 'One group per organization or person, biggest first.' },
    { value: 'repo', label: 'Repository', hint: 'One group per repository, biggest first.' },
  ],
  project: [
    { value: 'none', label: 'None', hint: 'One list.' },
    { value: 'author', label: 'Author', hint: 'One group per author, biggest first.' },
  ],
}

export const PULL_DETAIL_GROUPS: { title: string; items: { value: PullDetail; label: string; hint: string }[] }[] = [
  { title: 'Beside the title', items: [{ value: 'labels', label: 'Labels', hint: 'refactor, feature' }] },
  {
    title: 'Under the title',
    items: [
      { value: 'author', label: 'Author', hint: 'Photo and name' },
      { value: 'branch', label: 'Branch', hint: 'Off by default' },
      { value: 'time', label: 'Last update', hint: '3 h ago' },
      { value: 'size', label: 'Lines changed', hint: '+12 −3' },
      { value: 'comments', label: 'Comments', hint: 'When there are any' },
    ],
  },
  {
    title: 'Status',
    items: [
      { value: 'ci', label: 'Checks', hint: 'Green, amber or red dot' },
      { value: 'review', label: 'Review', hint: 'Approved, Needs review…' },
    ],
  },
]

// Renamed when the rows changed (title first, author back, branch off), so everyone starts from these once.
const KEY = 'ps:pull-view-2'
const DEFAULT: Record<PullDetail, boolean> = {
  labels: true,
  author: true,
  branch: false,
  time: true,
  size: true,
  comments: true,
  ci: true,
  review: true,
}
interface Stored {
  shown: Record<PullDetail, boolean>
  density: PullDensity
  grouping: Record<PullScope, PullGrouping>
}
const NO_GROUPING: Record<PullScope, PullGrouping> = { everywhere: 'none', project: 'none', all: 'repo' }
const allowed = (scope: PullScope, value: unknown): PullGrouping =>
  PULL_GROUPINGS[scope].some((g) => g.value === value) ? (value as PullGrouping) : NO_GROUPING[scope]

function read(): Stored {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Record<PullDetail, boolean>> & {
      density?: PullDensity
      grouping?: Partial<Record<PullScope, PullGrouping>>
    }
    const { density, grouping, ...details } = raw
    return {
      shown: { ...DEFAULT, ...details },
      density: density === 'compact' ? 'compact' : 'comfortable',
      grouping: {
        everywhere: allowed('everywhere', grouping?.everywhere),
        project: allowed('project', grouping?.project),
        all: allowed('all', grouping?.all),
      },
    }
  } catch {
    return { shown: { ...DEFAULT }, density: 'comfortable', grouping: { ...NO_GROUPING } }
  }
}

const start = read()
const shown = shallowRef(start.shown)
const density = shallowRef<PullDensity>(start.density)
const grouping = shallowRef<Record<PullScope, PullGrouping>>(start.grouping)

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...shown.value, density: density.value, grouping: grouping.value }))
  } catch {
    // Storage can be unavailable; the choice then lasts until the app closes.
  }
}

export function usePullView() {
  function set(detail: PullDetail, on: boolean) {
    shown.value = { ...shown.value, [detail]: on }
    save()
  }
  function setDensity(value: PullDensity) {
    density.value = value
    save()
  }
  function setGrouping(scope: PullScope, value: PullGrouping) {
    grouping.value = { ...grouping.value, [scope]: allowed(scope, value) }
    save()
  }
  function reset() {
    shown.value = { ...DEFAULT }
    density.value = 'comfortable'
    grouping.value = { ...NO_GROUPING }
    try {
      localStorage.removeItem(KEY)
    } catch {
      // Nothing stored to remove.
    }
  }
  // How many details differ from the defaults (a branch turned on counts too), for the View button.
  const changed = () =>
    (Object.keys(DEFAULT) as PullDetail[]).filter((k) => shown.value[k] !== DEFAULT[k]).length +
    (density.value === 'compact' ? 1 : 0) +
    (Object.keys(NO_GROUPING) as PullScope[]).filter((k) => grouping.value[k] !== NO_GROUPING[k]).length
  const hidden = () => (Object.keys(DEFAULT) as PullDetail[]).filter((k) => DEFAULT[k] && !shown.value[k]).length
  return { shown, density, grouping, set, setDensity, setGrouping, reset, hidden, changed }
}

// Folded groups, by scope, grouping and group, kept for next time.
const FOLDED_KEY = 'ps:pull-folded'
const folded = shallowRef<string[]>(
  (() => {
    try {
      const list: unknown = JSON.parse(localStorage.getItem(FOLDED_KEY) ?? '[]')
      return Array.isArray(list) ? list.map(String) : []
    } catch {
      return []
    }
  })(),
)
export function usePullFolds() {
  function toggle(key: string) {
    folded.value = folded.value.includes(key) ? folded.value.filter((k) => k !== key) : [...folded.value, key]
    saveFolded()
  }
  return { folded, toggle, setFolded }
}
function saveFolded() {
  try {
    localStorage.setItem(FOLDED_KEY, JSON.stringify(folded.value))
  } catch {
    // Lasts until the app closes.
  }
}
// Folds or opens every group in `keys` at once.
function setFolded(keys: string[], fold: boolean) {
  const rest = folded.value.filter((k) => !keys.includes(k))
  folded.value = fold ? [...rest, ...keys] : rest
  saveFolded()
}

// The folding groups each table shows now, by scope, so one button above them can fold or open them all.
const shownFolds = shallowRef<Record<number, { scope: PullScope; keys: string[] }>>({})
let nextTable = 0
export function useFoldRegistry() {
  const id = nextTable++
  return {
    show: (scope: PullScope, keys: string[]) => (shownFolds.value = { ...shownFolds.value, [id]: { scope, keys } }),
    hide: () => {
      const { [id]: _gone, ...rest } = shownFolds.value
      shownFolds.value = rest
    },
  }
}
export const foldKeysOf = (scope: PullScope) =>
  Object.values(shownFolds.value)
    .filter((t) => t.scope === scope)
    .flatMap((t) => t.keys)

export interface PullGroupOf<T> {
  key: string
  name: string
  items: T[]
}

// Splits a list into groups, biggest first, then A to Z; inside a group the list keeps its order.
export function groupPulls<T extends { owner: string; repo: string; author?: { login: string } | null }>(
  list: T[],
  how: PullGrouping,
): PullGroupOf<T>[] {
  if (how === 'none') return [{ key: '', name: '', items: list }]
  const keyOf = (p: T) => (how === 'owner' ? p.owner : how === 'repo' ? `${p.owner}/${p.repo}` : (p.author?.login ?? 'ghost'))
  const groups = new Map<string, PullGroupOf<T>>()
  for (const p of list) {
    const name = keyOf(p)
    const key = name.toLowerCase()
    const g = groups.get(key)
    if (g) g.items.push(p)
    else groups.set(key, { key, name, items: [p] })
  }
  return [...groups.values()].sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name))
}
