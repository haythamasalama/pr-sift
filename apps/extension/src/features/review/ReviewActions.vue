<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ChevronDown, GitMerge } from '@lucide/vue'
import type { MergeMethod, MergeReadiness, ReviewEvent, ReviewVerdict } from '@pr-sift/core'
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

// GitHub refuses the merge in these states, so the button stays visible but disabled, with the reason as its tooltip.
const MERGE_BLOCKED: MergeReadiness[] = ['conflicts', 'blocked', 'behind', 'draft']

const READINESS: Record<MergeReadiness, { tone: string; text: string } | null> = {
  ready: null,
  unknown: null,
  checks: { tone: 'bg-attention', text: 'Some checks are failing or still running' },
  blocked: { tone: 'bg-attention', text: 'Waiting for required reviews or checks' },
  behind: { tone: 'bg-attention', text: 'This branch is behind the base branch' },
  draft: { tone: 'bg-muted-foreground', text: 'This pull request is a draft' },
  conflicts: { tone: 'bg-destructive', text: 'This branch has conflicts' },
}

const sheetOpen = shallowRef(false)
const verdict = shallowRef<ReviewVerdict | null | undefined>(undefined)

const open = computed(() => info?.state !== 'merged' && info?.state !== 'closed')
const isAuthor = computed(() => !!conversation?.viewer && !!info?.author && conversation.viewer.toLowerCase() === info.author.toLowerCase())
const mine = computed(() => (verdict.value === undefined ? (conversation?.reviews.mine ?? null) : verdict.value))
// Your own pull request can never be approved by you, so Approve is not shown there at all.
const reviewBlocked = computed(() => (info?.state === 'draft' ? "Drafts can't be approved" : ''))
const mergeIsPrimary = computed(() => isAuthor.value || mine.value === 'approved')
const current = computed(() => METHODS.find((m) => m.value === method.value) ?? METHODS[0]!)
const readiness = computed(() => READINESS[conversation?.readiness ?? 'unknown'])
const MERGE_BLOCK_REASON: Partial<Record<MergeReadiness, string>> = {
  blocked: 'Needs an approval or required checks first',
  behind: 'Update the branch from its base first',
  conflicts: 'Has merge conflicts',
  draft: 'Still a draft',
}
const mergeBlocked = computed(() => {
  const state = conversation?.readiness ?? 'unknown'
  return MERGE_BLOCKED.includes(state) ? (MERGE_BLOCK_REASON[state] ?? '') : ''
})
const mergeTitle = computed(() =>
  mergeBlocked.value ? `Can’t merge yet: ${mergeBlocked.value}` : [current.value.action, readiness.value?.text].filter(Boolean).join(' · '),
)

function onReviewed(event: ReviewEvent) {
  if (event === 'APPROVE') verdict.value = 'approved'
  else if (event === 'REQUEST_CHANGES') verdict.value = 'changes_requested'
  emit('reviewed', event)
}
</script>

<template>
  <template v-if="open">
    <ReviewPopover
      v-if="!isAuthor"
      :pr="pr"
      :head-sha="headSha"
      :can-act="canAct"
      :mine="mine"
      :blocked="reviewBlocked"
      @reviewed="onReviewed"
    />
    <div
      class="flex shrink-0"
      :class="mergeBlocked ? 'cursor-not-allowed' : ''"
      :title="mergeBlocked ? mergeTitle : undefined"
      :tabindex="mergeBlocked ? 0 : undefined"
    >
      <Button
        :variant="mergeIsPrimary ? 'success' : 'outline'"
        :disabled="!!mergeBlocked"
        class="relative rounded-r-none px-3 text-[13px]"
        :class="mergeIsPrimary ? 'border-r-0' : ''"
        :title="mergeTitle"
        :aria-label="mergeBlocked ? `${current.action}, not possible yet: ${mergeBlocked}` : mergeTitle"
        @click="sheetOpen = true"
      >
        <span v-if="readiness" class="absolute -top-1 -left-1 size-2 rounded-full ring-2 ring-sidebar" :class="readiness.tone" />
        <GitMerge />
        <span class="hidden sm:inline lg:hidden">Merge</span><span class="hidden lg:inline">{{ current.action }}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            :variant="mergeIsPrimary ? 'success' : 'outline'"
            :disabled="!!mergeBlocked"
            size="icon"
            class="w-7 rounded-l-none [&_svg:not([class*=size-])]:size-3.5"
            :class="
              mergeIsPrimary
                ? 'border-l-0 shadow-[inset_1px_0_0_color-mix(in_oklab,var(--success-foreground)_30%,var(--success))]'
                : 'border-l-0'
            "
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
