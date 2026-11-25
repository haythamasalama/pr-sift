import { shallowRef } from 'vue'
import { appInfo } from './appInfo'
import { projectPath } from './format'
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

  async function setFullPaths(fullPaths: boolean) {
    settings.value = await bridge.invoke('settings:set', { fullPaths })
  }

  return { settings, ready: loading, add, remove, setDepth, setFullPaths }
}

// How every path in the app reads: from the project folder down, or the whole path when Settings asks for it.
export function usePathText() {
  useProjectFolders()
  return (path: string) => (settings.value?.fullPaths ? path : projectPath(path, settings.value?.roots ?? [], appInfo.home))
}
