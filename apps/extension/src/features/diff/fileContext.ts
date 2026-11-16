import { inject, type InjectionKey, type Ref } from 'vue'
import type { Thread } from '../review/conversation'

export interface FileContext {
  canExpand: Ref<boolean>
  loadLines: (filename: string) => Promise<string[]>
  githubUrl: (filename: string) => Promise<string>
  comments?: Ref<ReadonlyMap<string, number>>
  threads?: Ref<ReadonlyMap<string, Thread[]>>
}

export const fileContextKey: InjectionKey<FileContext> = Symbol('file-context')

export const useFileContext = () => inject(fileContextKey, null)
