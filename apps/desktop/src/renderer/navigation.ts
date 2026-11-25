import { shallowRef } from 'vue'
import type { PrRef } from '@/lib/types'

export type View = 'inbox' | 'project' | 'worktrees' | 'cleanup' | 'settings' | 'account'
export type ProjectTab = 'pulls' | 'issues' | 'branches' | 'worktrees' | 'files'

export const VIEWS: View[] = ['inbox', 'project', 'worktrees', 'cleanup', 'settings', 'account']

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
