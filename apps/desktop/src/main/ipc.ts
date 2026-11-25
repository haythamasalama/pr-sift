import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { Channel, Channels } from '#shared/ipc'

type Handler<C extends Channel> = (
  event: IpcMainInvokeEvent,
  ...args: Channels[C]['args']
) => Promise<Channels[C]['result']> | Channels[C]['result']

export function handle<C extends Channel>(channel: C, handler: Handler<C>, isTrusted: (event: IpcMainInvokeEvent) => boolean) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isTrusted(event)) throw new Error('Request from an unknown page.')
    return handler(event, ...(args as Channels[C]['args']))
  })
}
