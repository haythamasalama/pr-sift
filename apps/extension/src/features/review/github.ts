interface GhResponse<T> {
  ok: boolean
  status: number
  data: T & { message?: string }
}

import { alive, storageGet } from '../../lib/extension'

export class GhError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export function gh<T = unknown>(path: string, method?: string, body?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!alive()) return reject(new Error('The extension was reloaded. Reload this page.'))
    chrome.runtime.sendMessage({ type: 'gh', path, method, body }, (res: GhResponse<T>) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
      if (!res.ok) return reject(new GhError(`${res.status}: ${res.data?.message ?? 'request failed'}`, res.status))
      resolve(res.data)
    })
  })
}

interface TextResponse {
  ok: boolean
  status: number
  url: string
  text: string
  error?: string
}

export function backgroundText(url: string): Promise<TextResponse> {
  return new Promise((resolve, reject) => {
    if (!alive()) return reject(new Error('The extension was reloaded. Reload this page.'))
    chrome.runtime.sendMessage({ type: 'text', url }, (res: TextResponse) =>
      chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve(res),
    )
  })
}

export async function hasToken(): Promise<boolean> {
  return Boolean(await storageGet<string>('token'))
}
