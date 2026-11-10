import { shallowRef, watch, type Ref } from 'vue'
import { storageGet, storageSet } from '../../lib/extension'
import type { PrFile } from '../../lib/types'

export function useViewed(key: Ref<string>) {
  const viewed = shallowRef<Record<string, string>>({})
  let writes = 0

  watch(
    key,
    async (k) => {
      const writesAtStart = writes
      const stored = (await storageGet<Record<string, string>>('viewed2:' + k)) ?? {}
      if (writes === writesAtStart) viewed.value = stored
    },
    { immediate: true },
  )

  const isViewed = (f: PrFile) => viewed.value[f.filename] === f.hash
  const isStale = (f: PrFile) => {
    const seen = viewed.value[f.filename]
    return seen !== undefined && seen !== f.hash
  }

  async function persist(next: Record<string, string>) {
    writes++
    viewed.value = next
    await storageSet({ ['viewed2:' + key.value]: next })
  }

  function setMany(list: PrFile[], value: boolean) {
    const next = { ...viewed.value }
    for (const f of list) {
      if (value) next[f.filename] = f.hash
      else delete next[f.filename]
    }
    return persist(next)
  }

  const setViewed = (f: PrFile, value: boolean) => setMany([f], value)
  const clearAll = () => persist({})

  return { viewed, isViewed, isStale, setViewed, setMany, clearAll }
}
