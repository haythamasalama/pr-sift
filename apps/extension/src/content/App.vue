<script setup lang="ts">
import { RefreshCw } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, provide, shallowRef, useTemplateRef, watch } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import BrandMark from '../components/BrandMark.vue'
import { useGithubRefreshSignal } from '../features/review/useGithubRefreshSignal'
import { useAppearance } from '../features/appearance/useAppearance'
import { useGithubDark } from '../features/appearance/useGithubDark'
import { portalTargetKey } from '../lib/portal'
import { prKey, type PrRef } from '../lib/types'
import ReviewPanel from '../features/review/ReviewPanel.vue'

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
}

const reload = () => location.reload()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && !rootEl.value?.querySelector('[role="dialog"], [role="menu"]')) open.value = false
}

onMounted(() => {
  sync()
  timer = window.setInterval(sync, 800)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="root" class="ps-root" :class="{ dark }">
    <div v-if="pr && (dead || !open)" class="ps-root" :class="{ dark: githubDark }">
      <Button
        variant="outline"
        class="fixed right-5 bottom-5 z-30 h-9 gap-2 rounded-full border-border bg-popover pr-3.5 pl-1.5 text-popover-foreground shadow-sm hover:border-muted-foreground/40 hover:bg-secondary active:bg-accent dark:border-border dark:bg-popover dark:hover:bg-secondary [&_svg]:size-3.5"
        @click="dead ? reload() : (open = true)"
      >
        <span class="relative flex size-6 items-center justify-center">
          <span class="absolute inset-0 rounded-md bg-primary/40 motion-safe:animate-soft-ping" />
          <span class="relative flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <RefreshCw v-if="dead" />
            <BrandMark v-else class="size-3.5" />
          </span>
        </span>
        {{ dead ? 'Reload PR Sift' : 'PR Sift' }}
        <Badge
          v-if="externalUpdate && !dead"
          variant="outline"
          class="border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-400"
        >
          Updated
        </Badge>
      </Button>
    </div>
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
