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

export function openReview(pr: PrRef) {
  review.value = pr
}

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
