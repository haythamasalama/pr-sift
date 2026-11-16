import { shallowRef } from 'vue'
import { storageGet, storageSet } from '../../lib/extension'

export type NewMark = 'auto-open' | 'co-authors' | 'saved-filters' | 'updates'

const KEY = 'seenNew'

// A mark stays until the control it sits on is used once.
export function useNewMarks() {
  const seen = shallowRef<NewMark[] | null>(null)
  void storageGet<NewMark[]>(KEY).then((value) => (seen.value = value ?? []))

  const isNew = (mark: NewMark) => seen.value !== null && !seen.value.includes(mark)

  async function markSeen(mark: NewMark) {
    if (!isNew(mark)) return
    const stored = (await storageGet<NewMark[]>(KEY)) ?? []
    seen.value = [...new Set([...stored, ...seen.value!, mark])]
    await storageSet({ [KEY]: seen.value })
  }

  return { isNew, markSeen }
}
