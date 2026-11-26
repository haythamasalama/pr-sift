import { alive } from '../../lib/extension'
import type { DiffRow } from '../../lib/types'

export interface Highlighter {
  languageFor(filename: string): string | null
  highlightRows(rows: DiffRow[], filename: string): Map<number, string>
  highlightSnippet(code: string, filename: string): string
}

export const HIGHLIGHTER_GLOBAL = '__prSiftHighlighter'

type Host = typeof globalThis & { [HIGHLIGHTER_GLOBAL]?: Highlighter }

let ready: Highlighter | null = null
let loading: Promise<Highlighter> | null = null

export const highlighterReady = (): Highlighter | null => ready

// highlight.js with all its languages is most of the extension's size, so it is not part of the script that runs on
// every GitHub page. The background injects it into this page the first time a diff or a quote needs colours.
function inject(): Promise<Highlighter> {
  return new Promise((resolve, reject) => {
    const host = globalThis as Host
    if (host[HIGHLIGHTER_GLOBAL]) return resolve(host[HIGHLIGHTER_GLOBAL])
    if (!alive()) return reject(new Error('The extension was reloaded.'))
    chrome.runtime.sendMessage({ type: 'highlighter' }, () => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
      const highlighter = host[HIGHLIGHTER_GLOBAL]
      if (highlighter) resolve(highlighter)
      else reject(new Error('The highlighter did not load.'))
    })
  })
}

export function loadHighlighter(): Promise<Highlighter> {
  loading ??= (import.meta.env.MODE === 'test' ? import('./highlighter') : inject()).then(
    (highlighter) => (ready = highlighter),
    (e: unknown) => {
      loading = null
      throw e
    },
  )
  return loading
}

const escape = (text: string) => text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)

export const plainSnippet = (code: string) => escape(code)

export async function highlightRows(rows: DiffRow[], filename: string): Promise<Map<number, string>> {
  return (await loadHighlighter()).highlightRows(rows, filename)
}
