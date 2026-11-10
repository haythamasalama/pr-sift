import { inject, type InjectionKey, type Ref } from 'vue'
import type { DiffMode } from '../lib/types'

export const diffModeKey: InjectionKey<Ref<DiffMode>> = Symbol('diffMode')

export function useDiffMode(): Ref<DiffMode> {
  const mode = inject(diffModeKey)
  if (!mode) throw new Error('Diff mode is not provided')
  return mode
}
