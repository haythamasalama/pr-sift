import type { Bridge } from '#shared/ipc'

declare global {
  interface Window {
    prSift: Bridge
  }
}

export const bridge: Bridge = window.prSift
