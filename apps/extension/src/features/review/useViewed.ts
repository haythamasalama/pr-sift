import { onScopeDispose, shallowRef, watch, type Ref } from 'vue'
import { onStorageKey, storageGet, storageSet } from '../../lib/extension'
import type { PrFile } from '../../lib/types'

type Marks = Record<string, string>
type Before = Record<string, string | null>

const HISTORY_LIMIT = 50

export function useViewed(key: Ref<string>) {
  const viewed = shallowRef<Marks>({})
  let pending = 0
  let stopListening = () => {}
  let queue = Promise.resolve()
  let history: Before[] = []

  function remember(names: string[]) {
    history.push(Object.fromEntries(names.map((name) => [name, viewed.value[name] ?? null])))
    if (history.length > HISTORY_LIMIT) history.shift()
  }

  watch(
    key,
    async (k) => {
      stopListening()
      history = []
      stopListening = onStorageKey<Marks>('viewed2:' + k, (value) => (viewed.value = value ?? {}))
      const stored = (await storageGet<Marks>('viewed2:' + k)) ?? {}
      if (!pending) viewed.value = stored
    },
    { immediate: true },
  )
  onScopeDispose(() => stopListening())

  const isViewed = (f: PrFile) => viewed.value[f.filename] === f.hash
  const isStale = (f: PrFile) => {
    const seen = viewed.value[f.filename]
    return seen !== undefined && seen !== f.hash
  }

  function mutate(change: (marks: Marks) => Marks) {
    viewed.value = change(viewed.value)
    const storageKey = 'viewed2:' + key.value
    pending++
    queue = queue
      .then(async () => {
        const fresh = (await storageGet<Marks>(storageKey)) ?? {}
        await storageSet({ [storageKey]: change(fresh) })
      })
      .finally(() => pending--)
    return queue
  }

  function setMany(list: PrFile[], value: boolean) {
    remember(list.map((f) => f.filename))
    return mutate((marks) => {
      const next = { ...marks }
      for (const f of list) {
        if (value) next[f.filename] = f.hash
        else delete next[f.filename]
      }
      return next
    })
  }

  const setViewed = (f: PrFile, value: boolean) => setMany([f], value)
  function clearAll() {
    remember(Object.keys(viewed.value))
    return mutate(() => ({}))
  }

  function undo(): string[] | null {
    const before = history.pop()
    if (!before) return null
    void mutate((marks) => {
      const next = { ...marks }
      for (const [name, hash] of Object.entries(before)) {
        if (hash === null) delete next[name]
        else next[name] = hash
      }
      return next
    })
    return Object.keys(before)
  }

  return { viewed, isViewed, isStale, setViewed, setMany, clearAll, undo }
}
