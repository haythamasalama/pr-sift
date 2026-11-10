import { shallowRef } from 'vue'
import { fetchSignature, loadPr } from '../lib/pull'
import { prKey, type PrFile, type PrInfo, type PrRef, type Via } from '../lib/types'

export interface RefreshSummary {
  changed: number
  added: number
  removed: number
}

export function usePullRequest() {
  const files = shallowRef<PrFile[]>([])
  const info = shallowRef<PrInfo | null>(null)
  const via = shallowRef<Via>('session')
  const status = shallowRef<'loading' | 'ready' | 'error'>('loading')
  const error = shallowRef('')
  const signature = shallowRef('')
  let current = ''

  async function load(pr: PrRef) {
    const key = prKey(pr)
    current = key
    status.value = 'loading'
    error.value = ''
    try {
      const result = await loadPr(pr)
      if (current !== key) return
      files.value = result.files
      info.value = result.info
      via.value = result.via
      signature.value = result.signature
      status.value = 'ready'
    } catch (e) {
      if (current !== key) return
      error.value = e instanceof Error ? e.message : String(e)
      status.value = 'error'
    }
  }

  async function hasUpdate(pr: PrRef): Promise<boolean> {
    if (status.value !== 'ready') return false
    try {
      return (await fetchSignature(pr, via.value)) !== signature.value
    } catch {
      return false
    }
  }

  async function refresh(pr: PrRef): Promise<RefreshSummary | null> {
    try {
      const result = await loadPr(pr)
      const before = new Map(files.value.map((f) => [f.filename, f.hash]))
      const after = new Set(result.files.map((f) => f.filename))
      const summary: RefreshSummary = {
        changed: result.files.filter((f) => before.has(f.filename) && before.get(f.filename) !== f.hash).length,
        added: result.files.filter((f) => !before.has(f.filename)).length,
        removed: [...before.keys()].filter((name) => !after.has(name)).length,
      }
      files.value = result.files
      info.value = result.info
      via.value = result.via
      signature.value = result.signature
      return summary
    } catch {
      return null
    }
  }

  return { files, info, via, status, error, load, hasUpdate, refresh }
}
