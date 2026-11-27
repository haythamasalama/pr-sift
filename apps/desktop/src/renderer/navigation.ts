import { computed, shallowRef, watch } from 'vue'
import type { PrRef } from '@/lib/types'
import { parsePullLink } from '#shared/links'

export type View = 'inbox' | 'project' | 'worktree' | 'autoapprove' | 'worktrees' | 'cleanup' | 'settings' | 'account'
export type ProjectTab = 'pulls' | 'branches' | 'worktrees' | 'files'

export const VIEWS: View[] = ['inbox', 'project', 'worktree', 'autoapprove', 'worktrees', 'cleanup', 'settings', 'account']

export const view = shallowRef<View>('inbox')
// The project shown when the view is `project`, by folder path.
export const project = shallowRef<string | null>(null)
export const projectTab = shallowRef<ProjectTab>('pulls')
// The worktree whose changes are open when the view is `worktree`, by folder path.
export const worktree = shallowRef<string | null>(null)
// The auto-approve rule being edited, by id; null shows the list of rules.
export const autoRule = shallowRef<string | null>(null)
// The pull request open in the review panel, over everything else.
export const review = shallowRef<PrRef | null>(null)

// Leaving auto-approve closes the rule that was open there.
watch(view, (v) => {
  if (v !== 'autoapprove') autoRule.value = null
})

export function navigate(next: string) {
  if ((VIEWS as string[]).includes(next)) view.value = next as View
}

export function openProject(path: string, tab?: ProjectTab) {
  project.value = path
  if (tab) projectTab.value = tab
  view.value = 'project'
}

export function openWorktree(path: string) {
  worktree.value = path
  view.value = 'worktree'
}

// The list the open review came from, so Previous and Next walk through it.
export const reviewList = shallowRef<PrRef[]>([])
const samePr = (a: PrRef, b: PrRef) =>
  a.number === b.number && a.owner.toLowerCase() === b.owner.toLowerCase() && a.repo.toLowerCase() === b.repo.toLowerCase()

export function openReview(pr: PrRef, list?: PrRef[]) {
  review.value = pr
  reviewList.value = list?.some((p) => samePr(p, pr)) ? list.map(({ owner, repo, number }) => ({ owner, repo, number })) : []
}

// Where the open review sits in its list: its index, and the pull requests before and after it.
export const reviewPlace = computed(() => {
  const pr = review.value
  const list = reviewList.value
  const at = pr ? list.findIndex((p) => samePr(p, pr)) : -1
  return { at, total: list.length, previous: at > 0 ? list[at - 1] : undefined, next: at >= 0 ? list[at + 1] : undefined }
})
export function stepReview(by: -1 | 1) {
  const to = by < 0 ? reviewPlace.value.previous : reviewPlace.value.next
  if (to) review.value = to
}

// Focus shows the review over the whole window; otherwise the app's sidebar stays beside it. Remembered.
const FOCUS_KEY = 'ps:review-focus'
const readFocus = () => {
  try {
    return localStorage.getItem(FOCUS_KEY) === '1'
  } catch {
    return false
  }
}
export const reviewFocus = shallowRef(readFocus())
watch(reviewFocus, (on) => {
  try {
    localStorage.setItem(FOCUS_KEY, on ? '1' : '0')
  } catch {
    // Nothing to remember without storage.
  }
})

// A pull request link opens its review here in the app, not in the browser.
export function openPullLink(url: string) {
  const pr = parsePullLink(url)
  if (pr) openReview(pr)
}

// Where the person has been, so the back button can return them there.
interface Place {
  view: View
  project: string | null
  tab: ProjectTab
  worktree: string | null
}
const here = (): Place => ({ view: view.value, project: project.value, tab: projectTab.value, worktree: worktree.value })
const same = (a: Place, b: Place) =>
  a.view === b.view && (a.view !== 'project' || a.project === b.project) && (a.view !== 'worktree' || a.worktree === b.worktree)
const trail = shallowRef<Place[]>([])
let last = here()
let returning = false
watch([view, project, worktree], () => {
  const next = here()
  if (!returning && !same(last, next)) trail.value = [...trail.value, last].slice(-30)
  returning = false
  last = next
})
watch(projectTab, (tab) => (last = { ...last, tab }))

export const canGoBack = computed(() => trail.value.length > 0)
export function goBack() {
  const prev = trail.value.at(-1)
  if (!prev) return
  trail.value = trail.value.slice(0, -1)
  returning = true
  project.value = prev.project
  projectTab.value = prev.tab
  worktree.value = prev.worktree
  view.value = prev.view
}
