<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { CircleAlert, GitMerge, X } from '@lucide/vue'
import { formatPerson, MERGE_ACTIONS } from '@pr-sift/core'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import BrandMark from '../../components/BrandMark.vue'
import { contentStylesKey } from '../../lib/shadow'
import type { PrRef } from '../../lib/types'
import { watchToken } from '../review/github'
import { useMergeBoxAnchor } from './useMergeBoxAnchor'
import { useQuickMerge } from './useQuickMerge'

const { pr, dark } = defineProps<{ pr: PrRef; dark: boolean }>()

const NOTICE_MS = 8000

const { target, found, enabled } = useMergeBoxAnchor(inject(contentStylesKey, ''))
const { context, plan, mergeable, loading, busy, error, load, submit } = useQuickMerge(pr)

const connected = shallowRef(false)
const open = shallowRef(false)
const merged = shallowRef('')
let stopToken = () => {}
let noticeTimer = 0

const visible = computed(() => found.value && enabled.value && connected.value && mergeable.value && Boolean(plan.value))
const action = computed(() => (plan.value ? MERGE_ACTIONS[plan.value.method] : ''))
const label = computed(() => (plan.value?.withoutAi ? 'Merge without AI' : action.value))

watch(
  [found, connected],
  ([present, token]) => {
    if (present && token && !context.value && !loading.value) void load()
  },
  { immediate: true },
)

watch(open, (value) => {
  if (value) void load()
})

async function confirm() {
  const sha = await submit()
  if (!sha) return
  open.value = false
  merged.value = sha.slice(0, 7)
  clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => (merged.value = ''), NOTICE_MS)
}

onMounted(() => {
  stopToken = watchToken((present) => (connected.value = present))
})
onBeforeUnmount(() => {
  stopToken()
  clearTimeout(noticeTimer)
})
</script>

<template>
  <Teleport :to="target">
    <div v-if="visible && plan" class="ps-root" :class="{ dark }">
      <Popover v-model:open="open">
        <PopoverTrigger as-child>
          <Button variant="outline" title="Merge with PR Sift, leaving out the co-authors on your list">
            <BrandMark class="size-3.5" />
            {{ label }}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" side="top" class="w-96 gap-3 p-3">
          <div class="flex flex-col gap-0.5">
            <p class="font-medium">{{ action }}</p>
            <p class="text-xs text-muted-foreground">This commit goes to the base branch as shown.</p>
          </div>
          <div v-if="plan.method !== 'rebase'" class="flex flex-col gap-1.5 rounded-md border bg-muted p-2">
            <p class="text-xs font-medium break-words">{{ plan.title }}</p>
            <pre v-if="plan.message" class="max-h-40 overflow-y-auto font-mono text-xs whitespace-pre-wrap text-muted-foreground">{{
              plan.message
            }}</pre>
          </div>
          <p v-else class="text-xs text-muted-foreground">A rebase keeps every commit and its co-authors as they are.</p>
          <div v-if="plan.leftOut.length" class="flex flex-col gap-1">
            <p class="text-xs font-medium">Left out</p>
            <ul class="flex flex-col gap-0.5">
              <li v-for="person in plan.leftOut" :key="person.email" class="font-mono text-xs break-all text-muted-foreground line-through">
                {{ formatPerson(person) }}
              </li>
            </ul>
          </div>
          <p v-else-if="plan.method === 'merge' && plan.kept.length" class="text-xs text-muted-foreground">
            A merge commit keeps every commit as it is, so their co-authors stay in the history.
          </p>
          <Alert v-if="error" variant="destructive">
            <CircleAlert />
            <AlertDescription>{{ error }}</AlertDescription>
          </Alert>
          <Alert v-else-if="!loading && !mergeable">
            <CircleAlert />
            <AlertDescription>GitHub can’t merge this pull request right now.</AlertDescription>
          </Alert>
          <div class="flex justify-end gap-2">
            <Button variant="outline" size="sm" @click="open = false">Cancel</Button>
            <Button variant="success" size="sm" :disabled="busy || loading || !mergeable" @click="confirm">
              <Spinner v-if="busy || loading" />
              <GitMerge v-else />
              {{ action }}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  </Teleport>
  <div v-if="merged" class="ps-root" :class="{ dark }">
    <div
      role="status"
      class="fixed right-5 bottom-16 z-30 flex items-center gap-2 rounded-lg border bg-popover py-2 pr-2 pl-3 text-sm text-popover-foreground shadow-sm"
    >
      <GitMerge class="size-4 text-merged" />
      Merged as <span class="font-mono text-xs">{{ merged }}</span>
      <Button variant="ghost" size="icon-xs" aria-label="Dismiss" @click="merged = ''"><X /></Button>
    </div>
  </div>
</template>
