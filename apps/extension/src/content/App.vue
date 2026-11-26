<script setup lang="ts">
import { Check, RefreshCw } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, provide, shallowRef, useTemplateRef, watch } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import BrandMark from '../components/BrandMark.vue'
import BrandPulse from '../components/BrandPulse.vue'
import { useGithubRefreshSignal } from '../features/review/useGithubRefreshSignal'
import { useAppearance } from '../features/appearance/useAppearance'
import { useGithubDark } from '../features/appearance/useGithubDark'
import { useUpdates } from '../features/updates/useUpdates'
import { portalTargetKey } from '../lib/portal'
import { getSettings, onSettingsChange } from '../lib/settings'
import { prKey, type PrRef } from '../lib/types'
import ReviewPanel from '../features/review/ReviewPanel.vue'
import QuickMerge from '../features/quick-merge/QuickMerge.vue'
import OpenInApp from '../features/desktop/OpenInApp.vue'
import { appLink, handOffTarget, withoutMark } from '../features/desktop/handoff'

const PR_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)/

let timer = 0
const pr = shallowRef<PrRef | null>(null)
const open = shallowRef(false)
const dead = shallowRef(false)
const { dark, rootAttrs } = useAppearance()
const githubDark = useGithubDark()
const rootEl = useTemplateRef<HTMLElement>('root')
const portalEl = useTemplateRef<HTMLElement>('portal')
provide(portalTargetKey, portalEl)
const githubRefresh = useGithubRefreshSignal()
const acknowledged = shallowRef(false)
const externalUpdate = computed(() => githubRefresh.value && !acknowledged.value)
watch(githubRefresh, (present) => {
  if (!present) acknowledged.value = false
})
const { ready: updateReady, updated } = useUpdates()
const updateNote = computed(() => {
  if (updateReady.value) return `PR Sift ${updateReady.value} is ready`
  return updated.value ? `PR Sift was updated to ${updated.value.version}` : ''
})

function sync() {
  if (!chrome.runtime?.id) {
    dead.value = true
    clearInterval(timer)
    return
  }
  const m = PR_PATH.exec(location.pathname)
  const next = m ? { owner: m[1]!, repo: m[2]!, number: Number(m[3]) } : null
  if (prKey(next) !== prKey(pr.value)) pr.value = next
  if (!next) open.value = false
  maybeAutoOpen()
}

const autoOpen = shallowRef<boolean | null>(null)
const desktopApp = shallowRef(false)
let decidedFor = ''
let stopWatchingSettings = () => {}

// Each pull request gets one automatic open, so closing the review keeps it closed until the next pull request.
function maybeAutoOpen() {
  if (autoOpen.value === null || !pr.value || prKey(pr.value) === decidedFor) return
  decidedFor = prKey(pr.value)
  if (autoOpen.value && !dead.value) open.value = true
}

const reload = () => location.reload()

// A pull request opened from Slack, mail or another app goes straight to PR Sift for desktop, once, when the page first loads.
// The background closes this tab as soon as the app comes to the front.
function handOffToApp(): boolean {
  const navigation = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type
  const target = handOffTarget({ url: location.href, referrer: document.referrer, navigation })
  const clean = withoutMark(location.href)
  if (clean) history.replaceState(history.state, '', clean)
  if (!target) return false
  decidedFor = prKey(target)
  window.location.href = appLink(target)
  void Promise.resolve(chrome.runtime.sendMessage({ type: 'handoff' })).catch(() => {})
  return true
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && !rootEl.value?.querySelector('[role="dialog"], [role="menu"]')) open.value = false
}

onMounted(async () => {
  sync()
  timer = window.setInterval(sync, 800)
  document.addEventListener('keydown', onKey)
  stopWatchingSettings = onSettingsChange((next) => {
    autoOpen.value = next.autoOpen
    desktopApp.value = next.desktopApp
  })
  const settings = await getSettings()
  autoOpen.value = settings.autoOpen
  desktopApp.value = settings.desktopApp
  if (settings.desktopApp && !dead.value) handOffToApp()
  maybeAutoOpen()
})
onBeforeUnmount(() => {
  clearInterval(timer)
  document.removeEventListener('keydown', onKey)
  stopWatchingSettings()
})
</script>

<template>
  <div ref="root" class="ps-root" :class="{ dark }" v-bind="rootAttrs">
    <div v-if="pr && (dead || !open)" class="ps-root fixed right-5 bottom-5 z-30 flex items-center gap-2" :class="{ dark: githubDark }">
      <OpenInApp
        v-if="desktopApp && !dead"
        :pr="pr"
        class="size-9 rounded-lg border border-border bg-popover shadow-sm hover:bg-secondary dark:bg-popover dark:hover:bg-secondary"
      />
      <Button
        variant="outline"
        :class="[
          'relative h-9 gap-2 rounded-lg border-border bg-popover pr-3.5 pl-1.5 text-popover-foreground shadow-sm hover:border-muted-foreground/40 hover:bg-secondary active:bg-accent dark:border-border dark:bg-popover dark:hover:bg-secondary [&_svg]:size-3.5',
          dead ? 'border-destructive/40 text-destructive hover:text-destructive dark:border-destructive/40' : '',
        ]"
        :title="dead ? undefined : updateNote || undefined"
        @click="dead ? reload() : (open = true)"
      >
        <BrandPulse class="size-6">
          <RefreshCw v-if="dead" />
          <BrandMark v-else class="size-3.5" />
        </BrandPulse>
        {{ dead ? 'Reload PR Sift' : 'PR Sift' }}
        <Badge
          v-if="externalUpdate && !dead"
          variant="outline"
          class="gap-1 border-transparent bg-attention/15 text-attention [&_svg]:size-3"
        >
          <RefreshCw /> Changed
        </Badge>
        <Badge
          v-else-if="updated && !updateReady && !dead"
          data-update-badge
          variant="outline"
          class="gap-1 border-transparent bg-success-fg/15 text-success-fg [&_svg]:size-3"
        >
          <Check /> {{ updated.version }}
          <span class="sr-only">{{ updateNote }}</span>
        </Badge>
        <span
          v-if="updateReady && !dead"
          data-update-dot
          class="absolute -top-1 -right-1 size-2.5 rounded-full bg-attention ring-2 ring-background"
        >
          <span class="sr-only">{{ updateNote }}</span>
        </span>
      </Button>
    </div>
    <QuickMerge v-if="pr && !open && !dead" :key="`quick-${prKey(pr)}`" :pr="pr" :dark="githubDark" />
    <ReviewPanel
      v-if="pr && open && !dead"
      :key="prKey(pr)"
      :pr="pr"
      :external-update="externalUpdate"
      @refreshed="acknowledged = githubRefresh"
      @close="open = false"
    >
      <template v-if="desktopApp" #tools><OpenInApp :pr="pr" /></template>
    </ReviewPanel>
    <div ref="portal" />
  </div>
</template>
