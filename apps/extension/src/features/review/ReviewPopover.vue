<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { Check, ChevronDown, CircleAlert, KeyRound, MessageSquare, FileDiff, CheckCheck } from '@lucide/vue'
import type { ReviewEvent, ReviewVerdict } from '@pr-sift/core'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { openOptions } from '../../lib/extension'
import type { PrRef } from '../../lib/types'
import { explain, submitReview } from './actions'

const { pr, headSha, canAct, mine } = defineProps<{ pr: PrRef; headSha: string; canAct: boolean; mine: ReviewVerdict | null }>()
const emit = defineEmits<{ reviewed: [event: ReviewEvent] }>()

const EVENTS: { value: ReviewEvent; label: string; hint: string }[] = [
  { value: 'APPROVE', label: 'Approve', hint: 'Approve merging these changes.' },
  { value: 'REQUEST_CHANGES', label: 'Request changes', hint: 'Feedback that must be addressed before merging.' },
  { value: 'COMMENT', label: 'Comment', hint: 'General feedback, without approving.' },
]

const open = shallowRef(false)
const event = shallowRef<ReviewEvent>('APPROVE')
const comment = shallowRef('')
const busy = shallowRef(false)
const error = shallowRef('')

const needsComment = computed(() => event.value !== 'APPROVE' && !comment.value.trim())
const current = computed(() => EVENTS.find((e) => e.value === event.value)!)

watch(open, (value) => {
  if (value) error.value = ''
})

async function submit() {
  if (!canAct || busy.value || needsComment.value) return
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
    <PopoverTrigger as-child>
      <Button
        v-if="mine === 'approved'"
        variant="outline"
        size="sm"
        class="shrink-0 text-success-fg hover:text-success-fg"
        title="You approved this pull request. Review it again."
      >
        <CheckCheck /><span class="hidden sm:inline">Approved</span>
      </Button>
      <Button
        v-else-if="mine === 'changes_requested'"
        variant="outline"
        size="sm"
        class="shrink-0 text-destructive hover:text-destructive"
        title="You requested changes. Review it again."
      >
        <FileDiff /><span class="hidden sm:inline">Changes requested</span>
      </Button>
      <Button v-else variant="success" size="sm" class="shrink-0" title="Approve, request changes or comment">
        <Check /><span class="hidden sm:inline">Approve</span><ChevronDown class="opacity-80" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" class="w-80 gap-3 p-3">
      <p class="text-sm font-medium">Review this pull request</p>
      <template v-if="canAct">
        <Textarea
          v-model="comment"
          aria-label="Comment"
          rows="3"
          class="min-h-16 text-xs"
          :placeholder="event === 'APPROVE' ? 'Comment (optional)' : 'Comment'"
          @keydown.enter.ctrl.prevent="submit"
          @keydown.enter.meta.prevent="submit"
        />
        <RadioGroup
          :model-value="event"
          class="gap-0"
          aria-label="Review type"
          @update:model-value="(v) => v && (event = v as ReviewEvent)"
        >
          <Field
            v-for="e in EVENTS"
            :key="e.value"
            orientation="horizontal"
            class="items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/60"
            :title="e.hint"
          >
            <RadioGroupItem :id="`review-${e.value}`" :value="e.value" />
            <FieldLabel :for="`review-${e.value}`" class="flex-1 text-xs font-normal">{{ e.label }}</FieldLabel>
          </Field>
        </RadioGroup>
        <Alert v-if="error" variant="destructive" class="py-2">
          <CircleAlert />
          <AlertDescription class="text-xs">{{ error }}</AlertDescription>
        </Alert>
        <div class="flex items-center justify-end gap-2">
          <span class="mr-auto text-[11px] text-muted-foreground">Ctrl/⌘ + Enter</span>
          <Button variant="ghost" size="sm" @click="open = false">Cancel</Button>
          <Button :variant="event === 'APPROVE' ? 'success' : 'default'" size="sm" :disabled="busy || needsComment" @click="submit">
            <Spinner v-if="busy" />
            <Check v-else-if="event === 'APPROVE'" />
            <MessageSquare v-else />
            {{ current.label }}
          </Button>
        </div>
      </template>
      <div v-else class="flex flex-col items-start gap-2 text-xs text-muted-foreground">
        <p class="flex gap-2">
          <KeyRound class="mt-0.5 size-3.5 shrink-0" /> Reviewing from here needs a GitHub token with Pull requests set to read and write.
        </p>
        <Button size="sm" variant="outline" @click="openOptions">Open settings</Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
