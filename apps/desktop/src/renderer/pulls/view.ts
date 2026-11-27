import { shallowRef } from 'vue'

// Which details pull request rows show, and how roomy they are. A per-computer preference shared by every list,
// kept in local storage. People pick what they need from the View menu.
export type PullDetail = 'labels' | 'author' | 'branch' | 'time' | 'size' | 'comments' | 'ci' | 'review'
export type PullDensity = 'comfortable' | 'compact'

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
}

function read(): Stored {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Record<PullDetail, boolean>> & { density?: PullDensity }
    const { density, ...details } = raw
    return { shown: { ...DEFAULT, ...details }, density: density === 'compact' ? 'compact' : 'comfortable' }
  } catch {
    return { shown: { ...DEFAULT }, density: 'comfortable' }
  }
}

const start = read()
const shown = shallowRef(start.shown)
const density = shallowRef<PullDensity>(start.density)

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...shown.value, density: density.value }))
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
  function reset() {
    shown.value = { ...DEFAULT }
    density.value = 'comfortable'
    try {
      localStorage.removeItem(KEY)
    } catch {
      // Nothing stored to remove.
    }
  }
  // How many details differ from the defaults (a branch turned on counts too), for the View button.
  const changed = () =>
    (Object.keys(DEFAULT) as PullDetail[]).filter((k) => shown.value[k] !== DEFAULT[k]).length + (density.value === 'compact' ? 1 : 0)
  const hidden = () => (Object.keys(DEFAULT) as PullDetail[]).filter((k) => DEFAULT[k] && !shown.value[k]).length
  return { shown, density, set, setDensity, reset, hidden, changed }
}
