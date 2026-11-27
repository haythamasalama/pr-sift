import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS, EVENTS, type Bridge } from '#shared/ipc'

const channels = new Set<string>(CHANNELS)
const events = new Set<string>(EVENTS)

const bridge: Bridge = {
  invoke(channel, ...args) {
    if (!channels.has(channel)) return Promise.reject(new Error(`Unknown channel ${channel}`))
    return ipcRenderer.invoke(channel, ...args)
  },
  on(event, listener) {
    if (!events.has(event)) return () => undefined
    const wrapped = (_e: Electron.IpcRendererEvent, payload: Parameters<typeof listener>[0]) => listener(payload)
    ipcRenderer.on(event, wrapped)
    return () => ipcRenderer.removeListener(event, wrapped)
  },
}

contextBridge.exposeInMainWorld('prSift', bridge)
