import { shallowRef } from 'vue'

// Which details pull request rows show. A per-computer preference shared by every list, kept in local storage.
export type PullDetail = 'labels' | 'branch' | 'author' | 'size' | 'comments' | 'review' | 'ci'

export const PULL_DETAILS: { value: PullDetail; label: string }[] = [
  { value: 'labels', label: 'Labels' },
  { value: 'author', label: 'Author' },
  { value: 'branch', label: 'Branch' },
  { value: 'size', label: 'Lines changed' },
  { value: 'comments', label: 'Comments' },
  { value: 'review', label: 'Review status' },
  { value: 'ci', label: 'Checks' },
]

const KEY = 'ps:pull-view'
const ALL: Record<PullDetail, boolean> = {
  labels: true,
  // The branch is in the hint on the number; shown in the row only when asked for.
  branch: false,
  author: true,
  size: true,
  comments: true,
  review: true,
  ci: true,
}

function read(): Record<PullDetail, boolean> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...ALL, ...(JSON.parse(raw) as Partial<Record<PullDetail, boolean>>) } : { ...ALL }
  } catch {
    return { ...ALL }
  }
}

const shown = shallowRef(read())

export function usePullView() {
  function set(detail: PullDetail, on: boolean) {
    shown.value = { ...shown.value, [detail]: on }
    try {
      localStorage.setItem(KEY, JSON.stringify(shown.value))
    } catch {
      // Storage can be unavailable; the choice then lasts until the app closes.
    }
  }
  function reset() {
    shown.value = { ...ALL }
    try {
      localStorage.removeItem(KEY)
    } catch {
      // Nothing stored to remove.
    }
  }
  const hidden = () => Object.values(shown.value).filter((on) => !on).length
  return { shown, set, reset, hidden }
}
