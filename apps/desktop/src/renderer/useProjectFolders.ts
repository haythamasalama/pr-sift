import { shallowRef } from 'vue'
import type { DesktopSettings } from '#shared/ipc'
import { bridge } from './bridge'

const settings = shallowRef<DesktopSettings | null>(null)
let loading: Promise<void> | null = null

export function useProjectFolders() {
  loading ??= bridge.invoke('settings:get').then((s) => void (settings.value = s))

  async function add(): Promise<boolean> {
    const picked = await bridge.invoke('dialog:pick-folder')
    if (!picked || !settings.value) return false
    if (settings.value.roots.includes(picked)) return false
    settings.value = await bridge.invoke('settings:set', { roots: [...settings.value.roots, picked] })
    return true
  }

  async function remove(root: string) {
    if (!settings.value) return
    settings.value = await bridge.invoke('settings:set', { roots: settings.value.roots.filter((r) => r !== root) })
  }

  async function setDepth(depth: number) {
    settings.value = await bridge.invoke('settings:set', { depth })
  }

  return { settings, ready: loading, add, remove, setDepth }
}
