import type { AppInfo } from '#shared/ipc'

export const appInfo: AppInfo = { version: '', platform: 'darwin', home: '' }

export function setAppInfo(info: AppInfo) {
  Object.assign(appInfo, info)
}
