import { shallowRef } from 'vue'
import type { AuthStatus } from '#shared/ipc'
import { bridge } from './bridge'

const status = shallowRef<AuthStatus | null>(null)
let started = false

function start() {
  started = true
  bridge.on('auth:changed', (next) => (status.value = next))
  void bridge.invoke('auth:status').then((next) => (status.value = next))
}

export function useAuth() {
  if (!started) start()
  return {
    status,
    set: (next: AuthStatus) => (status.value = next),
  }
}
