<script setup lang="ts">
import { computed, shallowRef, watch, type Component } from 'vue'
import { Check, ChevronDown, CircleAlert, KeyRound, MessageSquare, FileDiff, CheckCheck } from '@lucide/vue'
import type { ReviewEvent, ReviewVerdict } from '@pr-sift/core'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { FieldLabel } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useSettingsOpener } from '../settings/useSettingsOpener'
import type { PrRef } from '../../lib/types'
import { explain, submitReview } from './actions'

const {
  pr,
  headSha,
  canAct,
  mine,
  blocked = '',
  changesBlocked = '',
} = defineProps<{
  pr: PrRef
  headSha: string
  canAct: boolean
  mine: ReviewVerdict | null
  // Why this person can't review, such as their own pull request. The button stays, disabled, with this as its tooltip.
  blocked?: string
  // Why Request changes isn't possible, such as on your own pull request. Comment always stays available.
  changesBlocked?: string
}>()
const emit = defineEmits<{ reviewed: [event: ReviewEvent] }>()

const EVENTS: { value: ReviewEvent; label: string; hint: string; icon: Component; tone: string }[] = [
  { value: 'APPROVE', label: 'Approve', hint: 'Approve merging these changes.', icon: Check, tone: 'text-success-fg' },
  {
    value: 'REQUEST_CHANGES',
    label: 'Request changes',
    hint: 'Feedback to address before merging.',
    icon: FileDiff,
    tone: 'text-destructive',
  },
  { value: 'COMMENT', label: 'Comment', hint: 'General feedback, without approving.', icon: MessageSquare, tone: 'text-muted-foreground' },
]

const open = shallowRef(false)
const openSettings = useSettingsOpener()
const event = shallowRef<ReviewEvent>('APPROVE')
const comment = shallowRef('')
const busy = shallowRef(false)
const error = shallowRef('')

const reasonFor = (value: ReviewEvent) => (value === 'APPROVE' ? blocked : value === 'REQUEST_CHANGES' ? changesBlocked : '')
const firstAllowed = () => EVENTS.find((e) => !reasonFor(e.value))?.value ?? 'COMMENT'

const needsComment = computed(() => event.value !== 'APPROVE' && !comment.value.trim())
const current = computed(() => EVENTS.find((e) => e.value === event.value)!)

watch(open, (value) => {
  if (!value) return
  error.value = ''
  if (reasonFor(event.value)) event.value = firstAllowed()
})

async function approveNow() {
  if (!canAct) {
    open.value = true
    return
  }
  event.value = 'APPROVE'
  await submit()
  if (error.value) open.value = true
}

async function submit() {
  if (!canAct || busy.value || needsComment.value || reasonFor(event.value)) return
  busy.value = true
  error.value = ''
  try {
    await submitReview(pr, headSha, event.value, comment.value)
    emit('reviewed', event.value)
    comment.value = ''
    open.value = false
  } catch (e) {
    error.value = explain(e, 'review')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger v-if="mine && !blocked" as-child>
      <Button
        v-if="mine === 'approved'"
        variant="outline"
        class="shrink-0 border-success-fg/30 bg-success-fg/10 px-3 text-[13px] text-success-fg hover:bg-success-fg/15 hover:text-success-fg"
        title="You approved this pull request. Review it again."
      >
        <CheckCheck /><span class="hidden sm:inline">Approved</span>
      </Button>
      <Button
        v-else-if="mine === 'changes_requested'"
        variant="outline"
        class="shrink-0 px-3 text-[13px] text-destructive hover:text-destructive"
        title="You requested changes. Review it again."
      >
        <FileDiff /><span class="hidden sm:inline">Changes requested</span>
      </Button>
    </PopoverTrigger>
    <div v-if="blocked" class="flex shrink-0">
      <span class="flex cursor-not-allowed" :title="blocked" tabindex="0" :aria-label="`Approve: ${blocked}`">
        <Button variant="success" class="rounded-r-none border-r-0 px-3 text-[13px]" disabled>
          <Check /><span class="hidden sm:inline">Approve</span>
        </Button>
      </span>
      <PopoverTrigger as-child>
        <Button
          variant="success"
          size="icon"
          class="w-7 rounded-l-none border-l-0 shadow-[inset_1px_0_0_color-mix(in_oklab,var(--success-foreground)_30%,var(--success))] [&_svg:not([class*=size-])]:size-3.5"
          :aria-label="changesBlocked ? 'Comment on this pull request' : 'Request changes or comment'"
          :title="changesBlocked ? 'Comment on this pull request' : 'Request changes or comment'"
        >
          <ChevronDown />
        </Button>
      </PopoverTrigger>
    </div>
    <div v-else-if="!mine" class="flex shrink-0">
      <Button
        variant="success"
        class="rounded-r-none border-r-0 px-3 text-[13px]"
        :disabled="busy"
        :title="canAct ? 'Approve this pull request' : 'Approve, request changes or comment'"
        @click="approveNow"
      >
        <Spinner v-if="busy" /><Check v-else /><span class="hidden sm:inline">Approve</span>
      </Button>
      <PopoverTrigger as-child>
        <Button
          variant="success"
          size="icon"
          class="w-7 rounded-l-none border-l-0 shadow-[inset_1px_0_0_color-mix(in_oklab,var(--success-foreground)_30%,var(--success))] [&_svg:not([class*=size-])]:size-3.5"
          aria-label="Approve with a comment, request changes or comment"
          title="Approve with a comment, request changes or comment"
        >
          <ChevronDown />
        </Button>
      </PopoverTrigger>
    </div>
    <PopoverContent align="end" class="w-80 gap-3 p-3">
      <p class="text-sm font-medium">Review this pull request</p>
      <template v-if="canAct">
        <Textarea
          v-model="comment"
          aria-label="Comment"
          rows="3"
          class="max-h-40 min-h-16 resize-none text-xs focus-visible:ring-2 focus-visible:ring-ring/25"
          :placeholder="event === 'APPROVE' ? 'Comment (optional)' : 'Comment (required)'"
          @keydown.enter.ctrl.prevent="submit"
          @keydown.enter.meta.prevent="submit"
        />
        <RadioGroup
          :model-value="event"
          class="gap-0 overflow-hidden rounded-md border"
          aria-label="Review type"
          @update:model-value="(v) => v && (event = v as ReviewEvent)"
        >
          <FieldLabel
            v-for="e in EVENTS"
            :key="e.value"
            :for="`review-${e.value}`"
            class="flex w-full items-start gap-2.5 border-b px-2.5 py-2 font-normal last:border-b-0"
            :class="
              reasonFor(e.value) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted/50 has-data-[state=checked]:bg-muted'
            "
            :title="reasonFor(e.value) || undefined"
          >
            <RadioGroupItem :id="`review-${e.value}`" :value="e.value" :disabled="!!reasonFor(e.value)" class="mt-px" />
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="flex items-center gap-1.5 text-xs font-medium">
                <component :is="e.icon" class="size-3.5" :class="e.tone" />{{ e.label }}
              </span>
              <span class="text-[11px] leading-snug text-muted-foreground">{{ reasonFor(e.value) || e.hint }}</span>
            </span>
          </FieldLabel>
        </RadioGroup>
        <Alert v-if="error" variant="destructive" class="py-2">
          <CircleAlert />
          <AlertDescription class="text-xs">{{ error }}</AlertDescription>
        </Alert>
        <div class="flex items-center justify-end gap-2">
          <span class="mr-auto text-[11px] text-muted-foreground">Ctrl/⌘ + Enter</span>
          <Button variant="outline" size="sm" @click="open = false">Cancel</Button>
          <Button
            :variant="event === 'APPROVE' ? 'success' : 'default'"
            size="sm"
            :disabled="busy || needsComment || !!reasonFor(event)"
            @click="submit"
          >
            <Spinner v-if="busy" />
            <component :is="current.icon" v-else />
            {{ current.label }}
          </Button>
        </div>
      </template>
      <div v-else class="flex flex-col items-start gap-2 text-xs text-muted-foreground">
        <p class="flex gap-2">
          <KeyRound class="mt-0.5 size-3.5 shrink-0" /> Reviewing from here needs a classic GitHub token with the repo scope.
        </p>
        <Button
          size="sm"
          variant="outline"
          @click="
            () => {
              open = false
              openSettings('token')
            }
          "
          >Connect GitHub</Button
        >
      </div>
    </PopoverContent>
  </Popover>
</template>
