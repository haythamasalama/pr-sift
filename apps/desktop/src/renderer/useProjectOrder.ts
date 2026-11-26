import { computed, shallowRef, type Ref } from 'vue'
import type { Project } from '#shared/ipc'

// How the sidebar lists projects. A per-computer preference, so it lives in local storage.
export type ProjectSort = 'name' | 'recent' | 'owner' | 'custom'

export const PROJECT_SORTS: { value: ProjectSort; label: string; hint: string }[] = [
  { value: 'name', label: 'Name', hint: 'A to Z' },
  { value: 'recent', label: 'Recently opened', hint: 'The last one you opened first' },
  { value: 'owner', label: 'Owner', hint: 'Grouped by GitHub owner, then A to Z' },
  { value: 'custom', label: 'Custom', hint: 'Drag projects into your own order' },
]

const KEY = { sort: 'ps:project-sort', opened: 'ps:project-opened', custom: 'ps:project-custom' }

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

const sort = shallowRef<ProjectSort>(read(KEY.sort, 'name'))
const opened = shallowRef<Record<string, number>>(read(KEY.opened, {}))
const custom = shallowRef<string[]>(read(KEY.custom, []))

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
  return {
    sort,
    sorted,
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
    // Moves a project to where another one is, for drag and drop in Custom.
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
