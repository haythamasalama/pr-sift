import { inject, type InjectionKey, type Ref } from 'vue'
import type { Thread } from '../review/conversation'

export interface FileContext {
  canExpand: Ref<boolean>
  loadLines: (filename: string) => Promise<string[]>
  githubUrl: (filename: string) => Promise<string>
  comments?: Ref<ReadonlyMap<string, number>>
  threads?: Ref<ReadonlyMap<string, Thread[]>>
  // Where the files are local (the desktop app's worktrees), throws away a file's uncommitted changes.
  discard?: (filename: string) => void
}

export const fileContextKey: InjectionKey<FileContext> = Symbol('file-context')

export const useFileContext = () => inject(fileContextKey, null)
