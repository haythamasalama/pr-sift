import { vi } from 'vitest'
import { shallowRef } from 'vue'
import { diffModeKey } from '../../src/composables/diffMode'
import { notesKey, type NotesContext } from '../../src/composables/useNotes'
import type { DiffMode, Note } from '../../src/lib/types'

export function notesContext(overrides: Partial<NotesContext> = {}, notes: Note[] = []): NotesContext {
  return {
    notes: shallowRef(notes),
    add: vi.fn(async () => {}),
    update: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    post: vi.fn(async () => {}),
    canPost: shallowRef(false),
    openOnGithub: vi.fn(async () => {}),
    ...overrides,
  }
}

export function provideContext(context: NotesContext, mode: DiffMode = 'unified') {
  return {
    [notesKey as symbol]: context,
    [diffModeKey as symbol]: shallowRef(mode),
  }
}
