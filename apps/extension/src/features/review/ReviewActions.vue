<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ChevronDown, GitMerge } from '@lucide/vue'
import type { MergeMethod, ReviewEvent, ReviewVerdict } from '@pr-sift/core'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { PrInfo, PrRef } from '../../lib/types'
import type { Conversation } from './conversation'
import MergeSheet from './MergeSheet.vue'
import ReviewPopover from './ReviewPopover.vue'

const { pr, info, headSha, canAct, conversation } = defineProps<{
  pr: PrRef
  info: PrInfo | null
  headSha: string
  canAct: boolean
  conversation: Conversation | null
}>()
const method = defineModel<MergeMethod>('method', { required: true })
const emit = defineEmits<{ reviewed: [event: ReviewEvent]; merged: [sha: string] }>()

const METHODS: { value: MergeMethod; action: string; hint: string }[] = [
  { value: 'squash', action: 'Squash and merge', hint: 'One commit on the base branch' },
  { value: 'merge', action: 'Merge pull request', hint: 'Every commit, plus a merge commit' },
  { value: 'rebase', action: 'Rebase and merge', hint: 'Every commit, without a merge commit' },
]

const sheetOpen = shallowRef(false)
const verdict = shallowRef<ReviewVerdict | null | undefined>(undefined)

const open = computed(() => info?.state !== 'merged' && info?.state !== 'closed')
const isAuthor = computed(() => !!conversation?.viewer && !!info?.author && conversation.viewer.toLowerCase() === info.author.toLowerCase())
const mine = computed(() => (verdict.value === undefined ? (conversation?.reviews.mine ?? null) : verdict.value))
const showReview = computed(() => !isAuthor.value)
const mergeIsPrimary = computed(() => !showReview.value || mine.value === 'approved')
const current = computed(() => METHODS.find((m) => m.value === method.value) ?? METHODS[0]!)
const readiness = computed(() =>
  conversation?.readiness === 'checks' ? { tone: 'bg-attention', text: 'Some checks are failing or still running' } : null,
)
// Merge shows only when GitHub would take it now: you can push, and nothing such as a missing approval holds it back.
const canMerge = computed(() => !!conversation?.canMerge && (conversation.readiness === 'ready' || conversation.readiness === 'checks'))
const mergeTitle = computed(() => [current.value.action, readiness.value?.text].filter(Boolean).join(' · '))

function onReviewed(event: ReviewEvent) {
  if (event === 'APPROVE') verdict.value = 'approved'
  else if (event === 'REQUEST_CHANGES') verdict.value = 'changes_requested'
  emit('reviewed', event)
}
</script>

<template>
  <template v-if="open">
    <ReviewPopover v-if="showReview" :pr="pr" :head-sha="headSha" :can-act="canAct" :mine="mine" @reviewed="onReviewed" />
    <div v-if="canMerge" class="flex shrink-0">
      <Button
        :variant="mergeIsPrimary ? 'success' : 'outline'"
        size="sm"
        class="relative rounded-r-none"
        :title="mergeTitle"
        :aria-label="mergeTitle"
        @click="sheetOpen = true"
      >
        <span v-if="readiness" class="absolute -top-1 -left-1 size-2 rounded-full" :class="readiness.tone" />
        <GitMerge />
        <span class="hidden sm:inline lg:hidden">Merge</span><span class="hidden lg:inline">{{ current.action }}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            :variant="mergeIsPrimary ? 'success' : 'outline'"
            size="icon-sm"
            class="w-6 rounded-l-none border-l"
            :class="mergeIsPrimary ? 'border-l-success-foreground/25' : ''"
            aria-label="Choose how to merge"
          >
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-60">
          <DropdownMenuLabel class="text-xs">Merge method</DropdownMenuLabel>
          <DropdownMenuRadioGroup :model-value="method" @update:model-value="(v) => (method = v as MergeMethod)">
            <DropdownMenuRadioItem v-for="m in METHODS" :key="m.value" :value="m.value" class="items-start">
              <span class="flex flex-col">
                <span>{{ m.action }}</span>
                <span class="text-[11px] text-muted-foreground">{{ m.hint }}</span>
              </span>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </template>
  <MergeSheet
    v-if="sheetOpen"
    :pr="pr"
    :info="info"
    :can-act="canAct"
    :method="method"
    @close="sheetOpen = false"
    @merged="
      (sha) => {
        sheetOpen = false
        emit('merged', sha)
      }
    "
  />
</template>
