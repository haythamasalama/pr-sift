import { shallowRef } from 'vue'
import type { Project } from '#shared/ipc'
import { bridge } from './bridge'

const projects = shallowRef<Project[] | null>(null)
let started = false

export function useProjects() {
  if (!started) {
    started = true
    bridge.on('projects:changed', (next) => (projects.value = next))
    void bridge.invoke('projects:list').then((list) => (projects.value = list))
  }
  const find = (path: string | null) => projects.value?.find((p) => p.path === path) ?? null
  return {
    projects,
    find,
    refresh: async () => (projects.value = await bridge.invoke('projects:list')),
    remove: (path: string) => bridge.invoke('projects:remove', path),
  }
}
