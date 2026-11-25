import { computed, shallowRef, watch } from 'vue'
import type { PrRef } from '@/lib/types'

export type View = 'inbox' | 'project' | 'autoapprove' | 'worktrees' | 'cleanup' | 'settings' | 'account'
export type ProjectTab = 'pulls' | 'branches' | 'worktrees' | 'files'

export const VIEWS: View[] = ['inbox', 'project', 'autoapprove', 'worktrees', 'cleanup', 'settings', 'account']

export const view = shallowRef<View>('inbox')
// The project shown when the view is `project`, by folder path.
export const project = shallowRef<string | null>(null)
export const projectTab = shallowRef<ProjectTab>('pulls')
// The pull request open in the review panel, over everything else.
export const review = shallowRef<PrRef | null>(null)

export function navigate(next: string) {
  if ((VIEWS as string[]).includes(next)) view.value = next as View
}

export function openProject(path: string, tab?: ProjectTab) {
  project.value = path
  if (tab) projectTab.value = tab
  view.value = 'project'
}

export function openReview(pr: PrRef) {
  review.value = pr
}

// Where the person has been, so the back button can return them there.
interface Place {
  view: View
  project: string | null
  tab: ProjectTab
}
const here = (): Place => ({ view: view.value, project: project.value, tab: projectTab.value })
const same = (a: Place, b: Place) => a.view === b.view && (a.view !== 'project' || a.project === b.project)
const trail = shallowRef<Place[]>([])
let last = here()
let returning = false
watch([view, project], () => {
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
  view.value = prev.view
}
