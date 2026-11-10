import { onScopeDispose, shallowRef, watch, type Ref } from 'vue'
import { onStorageKey, storageGet, storageSet } from '../../lib/extension'
import type { PrFile } from '../../lib/types'

type Marks = Record<string, string>

export function useViewed(key: Ref<string>) {
  const viewed = shallowRef<Marks>({})
  let pending = 0
  let stopListening = () => {}
  let queue = Promise.resolve()

  watch(
    key,
    async (k) => {
      stopListening()
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
  const clearAll = () => mutate(() => ({}))

  return { viewed, isViewed, isStale, setViewed, setMany, clearAll }
}
