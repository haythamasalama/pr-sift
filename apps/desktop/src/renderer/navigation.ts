import { shallowRef } from 'vue'

export type View = 'worktrees' | 'cleanup' | 'settings' | 'account'

export const VIEWS: View[] = ['worktrees', 'cleanup', 'settings', 'account']

export const view = shallowRef<View>('worktrees')

export function navigate(next: string) {
  if ((VIEWS as string[]).includes(next)) view.value = next as View
}
