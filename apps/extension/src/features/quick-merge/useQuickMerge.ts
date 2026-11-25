import { computed, onBeforeUnmount, shallowRef } from 'vue'
import {
  chooseMergeMethod,
  coAuthorChoices,
  defaultMergeMessage,
  mergeCommitMessage,
  mergeReadiness,
  type MergeReadiness,
} from '@pr-sift/core'
import { DEFAULTS, getSettings, onSettingsChange } from '../../lib/settings'
import type { PrRef, Settings } from '../../lib/types'
import { explain, loadMergeContext, merge, type MergeContext } from '../review/actions'

const UNMERGEABLE: MergeReadiness[] = ['conflicts', 'blocked', 'behind', 'draft']

// GitHub re-renders the pull request page often and the button mounts again each time, so the last context per pull
// request is kept to show the button at once while a fresh one loads.
const recent = new Map<string, MergeContext>()
const keyOf = (pr: PrRef) => `${pr.owner}/${pr.repo}#${pr.number}`

export function useQuickMerge(pr: PrRef) {
  const context = shallowRef<MergeContext | null>(recent.get(keyOf(pr)) ?? null)
  const settings = shallowRef<Settings>(DEFAULTS)
  const loading = shallowRef(false)
  const busy = shallowRef(false)
  const error = shallowRef('')

  const stop = onSettingsChange((next) => (settings.value = next))
  onBeforeUnmount(stop)

  const plan = computed(() => {
    const ctx = context.value
    if (!ctx) return null
    const s = settings.value
    const method = chooseMergeMethod(s.mergeMethod, ctx.allowed)
    const { title, body } = defaultMergeMessage(method, pr.number, ctx)
    const choices = coAuthorChoices(ctx.commits, ctx.author, {
      leaveOut: s.leaveOutCoAuthors,
      removed: s.removedCoAuthors,
      kept: s.keptCoAuthors,
    })
    return {
      method,
      title,
      message: mergeCommitMessage(method, body, choices),
      leftOut: method === 'squash' ? choices.filter((c) => !c.keep).map((c) => c.person) : [],
      kept: choices.filter((c) => method !== 'squash' || c.keep).map((c) => c.person),
      withoutAi: method === 'squash' && s.leaveOutCoAuthors,
    }
  })

  const mergeable = computed(() => Boolean(context.value) && !UNMERGEABLE.includes(mergeReadiness(context.value?.mergeableState)))

  async function load() {
    loading.value = true
    error.value = ''
    try {
      settings.value = await getSettings()
      context.value = await loadMergeContext(pr)
      recent.set(keyOf(pr), context.value)
    } catch (e) {
      error.value = explain(e, 'merge')
    } finally {
      loading.value = false
    }
  }

  async function submit(): Promise<string | null> {
    const ctx = context.value
    const next = plan.value
    if (!ctx || !next || busy.value) return null
    busy.value = true
    error.value = ''
    try {
      return await merge(pr, { method: next.method, sha: ctx.headSha, title: next.title.trim(), message: next.message })
    } catch (e) {
      error.value = explain(e, 'merge')
      return null
    } finally {
      busy.value = false
    }
  }

  return { context, plan, mergeable, loading, busy, error, load, submit }
}
