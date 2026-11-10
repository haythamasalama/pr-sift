import { inject, onScopeDispose, shallowRef, watch, type InjectionKey, type Ref } from 'vue'
import { onStorageKey, storageGet, storageSet } from '../../lib/extension'
import type { Note } from '../../lib/types'

export type NewNote = Omit<Note, 'id' | 'createdAt'>

export type NotePatch = Partial<Pick<Note, 'text' | 'line' | 'startLine' | 'lineText' | 'resolved'>>

export interface NotesContext {
  notes: Ref<Note[]>
  add: (note: NewNote) => Promise<void>
  update: (id: string, patch: NotePatch) => Promise<void>
  remove: (id: string) => Promise<void>
  post: (note: Note) => Promise<void>
  canPost: Ref<boolean>
  showResolved: Ref<boolean>
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
  let pending = 0
  let stopListening = () => {}
  let queue = Promise.resolve()

  watch(
    key,
    async (k) => {
      stopListening()
      stopListening = onStorageKey<Note[]>('notes:' + k, (value) => (notes.value = value ?? []))
      const stored = (await storageGet<Note[]>('notes:' + k)) ?? []
      if (!pending) notes.value = stored
    },
    { immediate: true },
  )
  onScopeDispose(() => stopListening())

  function mutate(change: (list: Note[]) => Note[]) {
    notes.value = change(notes.value)
    const storageKey = 'notes:' + key.value
    pending++
    queue = queue
      .then(async () => {
        const fresh = (await storageGet<Note[]>(storageKey)) ?? []
        await storageSet({ [storageKey]: change(fresh) })
      })
      .finally(() => pending--)
    return queue
  }

  const patch = (id: string, values: Partial<Note>) => mutate((list) => list.map((n) => (n.id === id ? { ...n, ...values } : n)))

  return {
    notes,
    add: (note: NewNote) => {
      const created: Note = { ...note, id: crypto.randomUUID(), createdAt: Date.now() }
      return mutate((list) => [...list, created])
    },
    update: (id: string, values: NotePatch) => patch(id, values),
    remove: (id: string) => mutate((list) => list.filter((n) => n.id !== id)),
    markPosted: (id: string, url: string) => patch(id, { postedUrl: url }),
    clear: () => mutate(() => []),
  }
}
