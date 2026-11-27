import { shallowRef } from 'vue'
import { fetchProbe, loadPr, takePrefetched, type Loaded } from './pull'
import { cachePr, readCachedPr } from './prCache'
import { prKey, type PrFile, type PrInfo, type PrRef, type Via } from '../../lib/types'

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
  const headSha = shallowRef('')
  /** The review shows a saved copy and the fresh one has different changes, waiting for a refresh. */
  const outdated = shallowRef(false)
  let current = ''
  let pending: Loaded | null = null

  function apply(result: Loaded) {
    files.value = result.files
    info.value = result.info
    via.value = result.via
    signature.value = result.signature
    headSha.value = result.headSha
  }

  async function load(pr: PrRef) {
    const key = prKey(pr)
    current = key
    pending = null
    outdated.value = false
    status.value = 'loading'
    error.value = ''
    const fresh = takePrefetched(pr) ?? loadPr(pr)
    fresh.catch(() => undefined)
    const cached = await readCachedPr(pr)
    if (current !== key) return
    if (cached) {
      apply(cached)
      status.value = 'ready'
    }
    try {
      const result = await fresh
      if (current !== key) return
      void cachePr(pr, result)
      if (!cached || result.via !== cached.via) {
        apply(result)
        status.value = 'ready'
      } else if (result.signature === cached.signature) {
        info.value = result.info
        headSha.value = result.headSha
      } else {
        info.value = result.info
        pending = result
        outdated.value = true
      }
    } catch (e) {
      if (current !== key || cached) return
      error.value = e instanceof Error ? e.message : String(e)
      status.value = 'error'
    }
  }

  async function hasUpdate(pr: PrRef): Promise<boolean> {
    if (status.value !== 'ready') return false
    if (outdated.value) return true
    try {
      const probe = await fetchProbe(pr, via.value)
      if (probe.state && info.value && probe.state !== info.value.state) info.value = { ...info.value, state: probe.state }
      return probe.signature !== signature.value
    } catch {
      return false
    }
  }

  async function refresh(pr: PrRef): Promise<RefreshSummary | null> {
    try {
      const result = pending ?? (await loadPr(pr))
      pending = null
      outdated.value = false
      const before = new Map(files.value.map((f) => [f.filename, f.hash]))
      const after = new Set(result.files.map((f) => f.filename))
      const summary: RefreshSummary = {
        changed: result.files.filter((f) => before.has(f.filename) && before.get(f.filename) !== f.hash).length,
        added: result.files.filter((f) => !before.has(f.filename)).length,
        removed: [...before.keys()].filter((name) => !after.has(name)).length,
      }
      apply(result)
      void cachePr(pr, result)
      return summary
    } catch {
      return null
    }
  }

  return { files, info, via, status, error, headSha, outdated, load, hasUpdate, refresh }
}
