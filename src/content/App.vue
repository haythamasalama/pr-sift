<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, shallowRef, useTemplateRef, watch } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import BrandMark from '../components/BrandMark.vue'
import { useGithubRefreshSignal } from '../composables/useGithubRefreshSignal'
import { useTheme } from '../composables/useTheme'
import { portalTargetKey } from '../lib/portal'
import { prKey, type PrRef } from '../lib/types'
import ReviewPanel from './components/ReviewPanel.vue'

const PR_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)/

let timer = 0
const pr = shallowRef<PrRef | null>(null)
const open = shallowRef(false)
const dead = shallowRef(false)
const dark = useTheme()
const rootEl = useTemplateRef<HTMLElement>('root')
provide(portalTargetKey, rootEl)
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
  if (e.key === 'Escape' && !rootEl.value?.querySelector('[role="dialog"]')) open.value = false
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
  <div ref="root" class="rl-root" :class="{ dark }">
    <Button v-if="dead && pr" class="fixed right-5 bottom-5 z-30 rounded-full shadow-lg" @click="reload">
      Review Lens was updated — reload the page
    </Button>
    <Button v-else-if="pr && !open" class="fixed right-5 bottom-5 z-30 rounded-full shadow-lg" @click="open = true">
      <BrandMark /> Review Lens
      <Badge v-if="externalUpdate" variant="secondary" class="bg-amber-400 text-black">Updated</Badge>
    </Button>
    <ReviewPanel
      v-if="pr && open && !dead"
      :key="prKey(pr)"
      :pr="pr"
      :external-update="externalUpdate"
      @refreshed="acknowledged = githubRefresh"
      @close="open = false"
    />
  </div>
</template>
