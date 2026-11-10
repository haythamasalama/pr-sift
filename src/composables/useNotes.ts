import { shallowRef, watch, type InjectionKey, type Ref, inject } from 'vue'
import { storageGet, storageSet } from '../lib/extension'
import type { Note } from '../lib/types'

export type NewNote = Omit<Note, 'id' | 'createdAt'>

export type NotePatch = Partial<Pick<Note, 'text' | 'line' | 'startLine' | 'lineText'>>

export interface NotesContext {
  notes: Ref<Note[]>
  add: (note: NewNote) => Promise<void>
  update: (id: string, patch: NotePatch) => Promise<void>
  remove: (id: string) => Promise<void>
  post: (note: Note) => Promise<void>
  canPost: Ref<boolean>
  openOnGithub: (note: Pick<Note, 'file' | 'side' | 'line' | 'startLine'>) => Promise<void>
}

export const notesKey: InjectionKey<NotesContext> = Symbol('notes')

export function useNotesContext(): NotesContext {
  const ctx = inject(notesKey)
  if (!ctx) throw new Error('Notes context is not provided')
  return ctx
}

export function useNotes(key: Ref<string>) {
  const notes = shallowRef<Note[]>([])
  let writes = 0

  watch(
    key,
    async (k) => {
      const writesAtStart = writes
      const stored = (await storageGet<Note[]>('notes:' + k)) ?? []
      if (writes === writesAtStart) notes.value = stored
    },
    { immediate: true },
  )

  async function persist(next: Note[]) {
    writes++
    notes.value = next
    await storageSet({ ['notes:' + key.value]: next })
  }

  return {
    notes,
    add: (note: NewNote) => persist([...notes.value, { ...note, id: crypto.randomUUID(), createdAt: Date.now() }]),
    update: (id: string, patch: NotePatch) => persist(notes.value.map((n) => (n.id === id ? { ...n, ...patch } : n))),
    remove: (id: string) => persist(notes.value.filter((n) => n.id !== id)),
    markPosted: (id: string, url: string) => persist(notes.value.map((n) => (n.id === id ? { ...n, postedUrl: url } : n))),
    clear: () => persist([]),
  }
}
