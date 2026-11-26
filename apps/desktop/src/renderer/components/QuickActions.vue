<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { ChevronDown, CircleAlert, GitMerge } from '@lucide/vue'
import {
  MERGE_ACTIONS,
  formatPerson,
  mergeReadiness,
  type MergeMethod,
  type MergeReadiness,
  type ReviewEvent,
  type ReviewVerdict,
} from '@pr-sift/core'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { getSettings, onSettingsChange, saveSetting } from '@/lib/settings'
import ReviewPopover from '@/features/review/ReviewPopover.vue'
import BypassRules from '@/features/quick-merge/BypassRules.vue'
import { useQuickMerge } from '@/features/quick-merge/useQuickMerge'
import type { PullItem } from '~/github'
import { useAuth } from '~/useAuth'
import Hint from './Hint.vue'

// Approve and merge straight from a list, with the same buttons, rules and words as the review in the extension.
// In a list each button shows only when you can use it, so rows stay calm; the review page keeps both in place, disabled with a reason.
const { pull } = defineProps<{ pull: PullItem }>()
const emit = defineEmits<{ changed: [] }>()

const { status } = useAuth()
const me = computed(() => status.value?.account?.login?.toLowerCase())
const prRef = { owner: pull.owner, repo: pull.repo, number: pull.number }
const merged = shallowRef('')

const VERDICTS: Record<string, ReviewVerdict> = { APPROVED: 'approved', CHANGES_REQUESTED: 'changes_requested' }
const verdict = shallowRef<ReviewVerdict | null | undefined>(undefined)
const mine = computed(() => (verdict.value === undefined ? (VERDICTS[pull.myReview ?? ''] ?? null) : verdict.value))
const isAuthor = computed(() => !!me.value && pull.author?.login.toLowerCase() === me.value)
const reviewBlocked = computed(() =>
  isAuthor.value ? "You can't approve your own pull request" : pull.draft ? "Drafts can't be approved" : '',
)

function onReviewed(event: ReviewEvent) {
  if (event === 'APPROVE') verdict.value = 'approved'
  else if (event === 'REQUEST_CHANGES') verdict.value = 'changes_requested'
  emit('changed')
}

const METHODS: { value: MergeMethod; action: string; hint: string }[] = [
  { value: 'squash', action: 'Squash and merge', hint: 'One commit on the base branch' },
  { value: 'merge', action: 'Create a merge commit', hint: 'Every commit, plus a merge commit' },
  { value: 'rebase', action: 'Rebase and merge', hint: 'Every commit, without a merge commit' },
]
const method = shallowRef<MergeMethod>('squash')
getSettings().then(
  (s) => (method.value = s.mergeMethod),
  () => {},
)
onBeforeUnmount(onSettingsChange((s) => s.mergeMethod && (method.value = s.mergeMethod)))
const current = computed(() => METHODS.find((m) => m.value === method.value) ?? METHODS[0]!)
function pickMethod(value: MergeMethod) {
  method.value = value
  void saveSetting('mergeMethod', value)
}

const READINESS: Partial<Record<MergeReadiness, { tone: string; text: string }>> = {
  checks: { tone: 'bg-attention', text: 'Some checks are failing or still running' },
  blocked: { tone: 'bg-attention', text: 'Waiting for required reviews or checks' },
  behind: { tone: 'bg-attention', text: 'This branch is behind the base branch' },
  draft: { tone: 'bg-muted-foreground', text: 'This pull request is a draft' },
  conflicts: { tone: 'bg-destructive', text: 'This branch has conflicts' },
}
const MERGE_BLOCK_REASON: Partial<Record<MergeReadiness, string>> = {
  blocked: 'Needs an approval or required checks first',
  behind: 'Update the branch from its base first',
  conflicts: 'Has merge conflicts',
  draft: 'Still a draft',
}
const state = computed<MergeReadiness>(() => (pull.draft ? 'draft' : mergeReadiness(pull.mergeState?.toLowerCase())))
const readiness = computed(() => READINESS[state.value] ?? null)
const mergeBlocked = computed(() => {
  if (!pull.canMerge) return 'You don’t have permission to merge here'
  // GitHub still lets you merge a blocked pull request when you can bypass its rules.
  if (pull.mergeableNow) return ''
  return MERGE_BLOCK_REASON[state.value] ?? ''
})
const mergeIsPrimary = computed(() => isAuthor.value || mine.value === 'approved')
const mergeTitle = computed(() => {
  const note = state.value === 'blocked' && pull.mergeableNow ? 'You can bypass the rules' : readiness.value?.text
  return [current.value.action, note].filter(Boolean).join(' · ')
})

const open = shallowRef(false)
const { plan, ready, canBypass, bypass, mergeable, loading, busy, error, load, submit } = useQuickMerge(prRef)
const bypassing = computed(() => canBypass.value && bypass.value)
const action = computed(() =>
  bypassing.value ? 'Bypass rules and merge' : plan.value ? MERGE_ACTIONS[plan.value.method] : current.value.action,
)
watch(open, (value) => {
  bypass.value = false
  if (value) void load()
})

async function confirm() {
  const sha = await submit()
  if (!sha) return
  open.value = false
  merged.value = sha.slice(0, 7)
  emit('changed')
}
</script>

<template>
  <div class="flex shrink-0 items-center gap-2" @click.stop>
    <Hint v-if="merged" :text="`Merged as ${merged}`">
      <span class="flex items-center gap-1 text-xs text-merged"><GitMerge class="size-3.5" /> Merged</span>
    </Hint>
    <template v-else>
      <ReviewPopover v-if="!reviewBlocked" :pr="prRef" :head-sha="pull.headSha" can-act :mine="mine" @reviewed="onReviewed" />

      <Popover v-if="!mergeBlocked" v-model:open="open">
        <div class="flex shrink-0">
          <PopoverTrigger as-child>
            <Button
              :variant="mergeIsPrimary ? 'success' : 'outline'"
              class="relative rounded-r-none px-3 text-[13px] @max-3xl:px-2"
              :class="mergeIsPrimary ? 'border-r-0' : ''"
              :title="mergeTitle"
              :aria-label="mergeTitle"
            >
              <span v-if="readiness" class="absolute -top-1 -left-1 size-2 rounded-full ring-2 ring-background" :class="readiness.tone" />
              <GitMerge /><span class="@max-3xl:hidden @5xl:hidden">Merge</span><span class="hidden @5xl:inline">{{ current.action }}</span>
            </Button>
          </PopoverTrigger>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button
                :variant="mergeIsPrimary ? 'success' : 'outline'"
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
              <DropdownMenuRadioGroup :model-value="method" @update:model-value="(v) => pickMethod(v as MergeMethod)">
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
        <PopoverContent align="end" class="w-96 gap-3 p-3">
          <div class="flex flex-col gap-0.5">
            <p class="font-medium">{{ action }}</p>
            <p class="text-xs text-muted-foreground">#{{ pull.number }} goes into {{ pull.base }} with this commit.</p>
          </div>
          <div v-if="loading && !plan" class="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <Spinner class="size-3.5" /> Asking GitHub…
          </div>
          <template v-else-if="plan">
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
                <li
                  v-for="person in plan.leftOut"
                  :key="person.email"
                  class="font-mono text-xs break-all text-muted-foreground line-through"
                >
                  {{ formatPerson(person) }}
                </li>
              </ul>
            </div>
          </template>
          <Alert v-if="error" variant="destructive">
            <CircleAlert />
            <AlertDescription>{{ error }}</AlertDescription>
          </Alert>
          <BypassRules v-else-if="!loading && plan && canBypass" v-model="bypass" />
          <Alert v-else-if="!loading && plan && !ready">
            <CircleAlert />
            <AlertDescription
              >GitHub can’t merge this pull request right now. It may need reviews, passing checks or an update.</AlertDescription
            >
          </Alert>
          <div class="flex justify-end gap-2">
            <Button variant="outline" size="sm" @click="open = false">Cancel</Button>
            <Button :variant="bypassing ? 'destructive' : 'success'" size="sm" :disabled="busy || loading || !mergeable" @click="confirm">
              <Spinner v-if="busy || loading" /><GitMerge v-else />
              {{ action }}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </template>
  </div>
</template>
