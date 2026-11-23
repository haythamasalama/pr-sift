<script setup lang="ts">
import { RefreshCw } from '@lucide/vue'
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

const PR_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)/

let timer = 0
const pr = shallowRef<PrRef | null>(null)
const open = shallowRef(false)
const dead = shallowRef(false)
const { dark } = useAppearance()
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
let decidedFor = ''
let stopWatchingSettings = () => {}

// Each pull request gets one automatic open, so closing the review keeps it closed until the next pull request.
function maybeAutoOpen() {
  if (autoOpen.value === null || !pr.value || prKey(pr.value) === decidedFor) return
  decidedFor = prKey(pr.value)
  if (autoOpen.value && !dead.value) open.value = true
}

const reload = () => location.reload()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && !rootEl.value?.querySelector('[role="dialog"], [role="menu"]')) open.value = false
}

onMounted(async () => {
  sync()
  timer = window.setInterval(sync, 800)
  document.addEventListener('keydown', onKey)
  stopWatchingSettings = onSettingsChange((next) => (autoOpen.value = next.autoOpen))
  autoOpen.value = (await getSettings()).autoOpen
  maybeAutoOpen()
})
onBeforeUnmount(() => {
  clearInterval(timer)
  document.removeEventListener('keydown', onKey)
  stopWatchingSettings()
})
</script>

<template>
  <div ref="root" class="ps-root" :class="{ dark }">
    <div v-if="pr && (dead || !open)" class="ps-root" :class="{ dark: githubDark }">
      <Button
        variant="outline"
        class="fixed right-5 bottom-5 z-30 h-9 gap-2 rounded-lg border-border bg-popover pr-3.5 pl-1.5 text-popover-foreground shadow-sm hover:border-muted-foreground/40 hover:bg-secondary active:bg-accent dark:border-border dark:bg-popover dark:hover:bg-secondary [&_svg]:size-3.5"
        :title="dead ? undefined : updateNote || undefined"
        @click="dead ? reload() : (open = true)"
      >
        <BrandPulse class="size-6">
          <RefreshCw v-if="dead" />
          <BrandMark v-else class="size-3.5" />
        </BrandPulse>
        {{ dead ? 'Reload PR Sift' : 'PR Sift' }}
        <Badge v-if="externalUpdate && !dead" variant="outline" class="border-attention/50 bg-attention/15 text-attention"> Updated </Badge>
        <span
          v-if="updateNote && !dead"
          data-update-dot
          class="absolute -top-1 -right-1 size-2.5 rounded-full ring-2 ring-background"
          :class="updateReady ? 'bg-emphasis' : 'bg-success'"
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
    />
    <div ref="portal" />
  </div>
</template>
