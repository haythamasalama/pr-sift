import { computed, onScopeDispose, shallowRef } from 'vue'
import { storageRemove } from '../../lib/extension'
import { DEFAULTS, getSettings, onSettingsChange, saveSetting } from '../../lib/settings'
import type { Settings } from '../../lib/types'

export function useSettingsState() {
  const settings = shallowRef<Settings>(DEFAULTS)
  let writes = 0

  // A change event can carry an older value while a later write is still going, so those are skipped and the stored
  // settings are read again once the last write lands.
  const stop = onSettingsChange((next) => {
    if (writes === 0) settings.value = next
  })
  onScopeDispose(stop)

  async function write(task: () => Promise<void>) {
    writes++
    try {
      await task()
    } finally {
      writes--
    }
    if (writes > 0) return
    const fresh = await getSettings()
    if (writes === 0) settings.value = fresh
  }

  async function load() {
    settings.value = await getSettings()
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    settings.value = { ...settings.value, [key]: value }
    return write(() => saveSetting(key, value))
  }

  function reset() {
    settings.value = DEFAULTS
    return write(() => storageRemove('settings'))
  }

  return { settings: computed(() => settings.value), load, update, reset }
}
