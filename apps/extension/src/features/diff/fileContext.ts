import { inject, type InjectionKey, type Ref } from 'vue'

export interface FileContext {
  canExpand: Ref<boolean>
  loadLines: (filename: string) => Promise<string[]>
  githubUrl: (filename: string) => Promise<string>
}

export const fileContextKey: InjectionKey<FileContext> = Symbol('file-context')

export const useFileContext = () => inject(fileContextKey, null)
