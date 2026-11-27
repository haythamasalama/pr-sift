import { computed, shallowRef, type Ref } from 'vue'
import type { Project } from '#shared/ipc'

// How the sidebar lists projects. A per-computer preference, so it lives in local storage.
export type ProjectSort = 'name' | 'recent' | 'owner' | 'custom'

// 'owner' is kept only to read what older versions saved; owners are a grouping now.
export const PROJECT_SORTS: { value: ProjectSort; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'recent', label: 'Recently opened' },
  { value: 'custom', label: 'Custom' },
]

// Owner: a heading per GitHub owner. Repository: folders of the same repository sit together. Owner does that too.
export type ProjectGrouping = 'none' | 'owner' | 'repo'

export const PROJECT_GROUPINGS: { value: ProjectGrouping; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'owner', label: 'Owner' },
  { value: 'repo', label: 'Repository' },
]

const KEY = {
  sort: 'ps:project-sort',
  opened: 'ps:project-opened',
  custom: 'ps:project-custom',
  group: 'ps:project-group',
  grouping: 'ps:project-grouping',
  folded: 'ps:project-folded',
  branch: 'ps:project-show-branch',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable; the order then lasts until the app closes.
  }
}

const savedSort = read<ProjectSort>(KEY.sort, 'name')
const sort = shallowRef<ProjectSort>(savedSort === 'owner' ? 'name' : savedSort)
const opened = shallowRef<Record<string, number>>(read(KEY.opened, {}))
const custom = shallowRef<string[]>(read(KEY.custom, []))
// Older versions had an Owner sort and a Group by repository switch; both become a grouping.
const grouping = shallowRef<ProjectGrouping>(
  read<ProjectGrouping | null>(KEY.grouping, null) ?? (savedSort === 'owner' ? 'owner' : read(KEY.group, true) ? 'repo' : 'none'),
)
// Repositories whose folders are folded away, by group key.
const folded = shallowRef<string[]>(read(KEY.folded, []))
// Whether a repository's folders show the branch each has checked out, beside the folder name.
const showBranch = shallowRef<boolean>(read(KEY.branch, true))
const DEFAULTS = { sort: 'name' as ProjectSort, grouping: 'repo' as ProjectGrouping, showBranch: true }

export interface ProjectGroup {
  // owner/repo for a GitHub repository, the folder path otherwise.
  key: string
  // The name shown on a group of several folders.
  title: string
  projects: Project[]
  // With grouping by owner: the owner it sits under ('' for folders that aren't on GitHub).
  owner?: string
}

const ownerOf = (p: Project) => p.github?.owner.toLowerCase() ?? ''

// Keeps the chosen order inside each owner; owners go A to Z, folders that aren't on GitHub last.
export function byOwner(list: Project[]): Project[] {
  return [...list].sort((a, b) => {
    const x = ownerOf(a)
    const y = ownerOf(b)
    if (x === y) return 0
    return !x ? 1 : !y ? -1 : x.localeCompare(y)
  })
}

// Groups an already sorted list. A group sits where its first folder sits, and keeps its folders in that order.
export function groupProjects(list: Project[], repo: boolean): ProjectGroup[] {
  const groups = new Map<string, ProjectGroup>()
  for (const p of list) {
    const key = repo && p.github ? `${p.github.owner}/${p.github.repo}`.toLowerCase() : p.path
    const group = groups.get(key)
    if (group) group.projects.push(p)
    else groups.set(key, { key, title: p.github && repo ? p.github.repo : p.name, projects: [p] })
  }
  return [...groups.values()]
}

const byName = (a: Project, b: Project) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })

export function sortProjects(list: Project[], how: ProjectSort, openedAt: Record<string, number>, order: string[]): Project[] {
  const out = [...list]
  if (how === 'name') return out.sort(byName)
  if (how === 'recent') return out.sort((a, b) => (openedAt[b.path] ?? 0) - (openedAt[a.path] ?? 0) || byName(a, b))
  if (how === 'owner') {
    // Projects without a GitHub remote come last.
    const owner = (p: Project) => p.github?.owner.toLowerCase()
    return out.sort((a, b) => {
      const x = owner(a)
      const y = owner(b)
      if (x !== y) return x === undefined ? 1 : y === undefined ? -1 : x.localeCompare(y)
      return byName(a, b)
    })
  }
  // Custom: your order first; projects added since then go to the end, A to Z.
  const at = new Map(order.map((path, i) => [path, i]))
  return out.sort((a, b) => (at.get(a.path) ?? Infinity) - (at.get(b.path) ?? Infinity) || byName(a, b))
}

export function useProjectOrder(projects: Ref<Project[] | null>) {
  const sorted = computed(() => sortProjects(projects.value ?? [], sort.value, opened.value, custom.value))
  const groups = computed(() => {
    if (grouping.value !== 'owner') return groupProjects(sorted.value, grouping.value === 'repo')
    return groupProjects(byOwner(sorted.value), true).map((g) => ({ ...g, owner: ownerOf(g.projects[0]!) }))
  })
  return {
    sort,
    showBranch,
    isDefault: computed(
      () => sort.value === DEFAULTS.sort && grouping.value === DEFAULTS.grouping && showBranch.value === DEFAULTS.showBranch,
    ),
    setShowBranch(on: boolean) {
      showBranch.value = on
      write(KEY.branch, on)
    },
    reset() {
      sort.value = DEFAULTS.sort
      grouping.value = DEFAULTS.grouping
      showBranch.value = DEFAULTS.showBranch
      for (const k of [KEY.sort, KEY.grouping, KEY.branch])
        write(k, k === KEY.sort ? DEFAULTS.sort : k === KEY.grouping ? DEFAULTS.grouping : true)
    },
    sorted,
    groups,
    grouping,
    folded,
    setGrouping(value: ProjectGrouping) {
      grouping.value = value
      write(KEY.grouping, value)
    },
    toggleFolded(key: string) {
      folded.value = folded.value.includes(key) ? folded.value.filter((k) => k !== key) : [...folded.value, key]
      write(KEY.folded, folded.value)
    },
    setSort(value: ProjectSort) {
      // Switching to Custom starts from what you see now, so nothing jumps.
      if (value === 'custom' && sort.value !== 'custom') {
        custom.value = sorted.value.map((p) => p.path)
        write(KEY.custom, custom.value)
      }
      sort.value = value
      write(KEY.sort, value)
    },
    markOpened(path: string) {
      opened.value = { ...opened.value, [path]: Date.now() }
      write(KEY.opened, opened.value)
    },
    // Keeps the order a drag left behind, and switches to Custom so it stays that way.
    place(order: string[]) {
      custom.value = order
      write(KEY.custom, order)
      sort.value = 'custom'
      write(KEY.sort, 'custom')
    },
    // Moves a project to where another one is.
    move(from: string, to: string) {
      const order = sorted.value.map((p) => p.path).filter((p) => p !== from)
      const index = order.indexOf(to)
      if (index < 0) return
      const fromIndex = sorted.value.findIndex((p) => p.path === from)
      const toIndex = sorted.value.findIndex((p) => p.path === to)
      order.splice(fromIndex < toIndex ? index + 1 : index, 0, from)
      custom.value = order
      if (sort.value !== 'custom') {
        sort.value = 'custom'
        write(KEY.sort, 'custom')
      }
      write(KEY.custom, order)
    },
  }
}
