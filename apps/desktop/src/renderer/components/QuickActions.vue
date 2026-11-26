<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from 'vue'
import { Check, CircleAlert, GitMerge } from '@lucide/vue'
import { MERGE_ACTIONS, approveBlockReason, formatPerson, mergeBlockReason, mergeReadiness } from '@pr-sift/core'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { getSettings } from '@/lib/settings'
import { explain, submitReview } from '@/features/review/actions'
import { useQuickMerge } from '@/features/quick-merge/useQuickMerge'
import type { PullItem } from '~/github'
import { useAuth } from '~/useAuth'
import Hint from './Hint.vue'

// Approve and merge straight from a list. Both stay in place; when GitHub would refuse, they are disabled and say why.
const { pull } = defineProps<{ pull: PullItem }>()
const emit = defineEmits<{ changed: [] }>()

const { status } = useAuth()
const me = computed(() => status.value?.account?.login?.toLowerCase())
const prRef = { owner: pull.owner, repo: pull.repo, number: pull.number }

const approving = shallowRef(false)
const approved = shallowRef(pull.myReview === 'APPROVED')
const approveError = shallowRef('')
const merged = shallowRef('')

const isAuthor = computed(() => !!me.value && pull.author?.login.toLowerCase() === me.value)
// GitHub never lets you approve your own pull request, so Approve is hidden there instead of disabled.
const approveHold = computed(() => approveBlockReason({ isAuthor: false, draft: pull.draft }))
// Green when nothing is off, amber when only optional checks failed or you bypass the rules.
const ready = computed(() => pull.mergeState === 'CLEAN' || pull.mergeState === 'HAS_HOOKS')
const mergeHold = computed(() =>
  pull.mergeableNow
    ? null
    : mergeBlockReason(pull.draft ? 'draft' : mergeReadiness(pull.mergeState?.toLowerCase()), { canPush: pull.canMerge }, pull.decision),
)
const mergeNote = computed(() =>
  ready.value ? 'ready to merge' : pull.mergeState === 'BLOCKED' ? 'you can bypass the branch rules' : 'some optional checks did not pass',
)

async function approve() {
  if (approving.value || approved.value) return
  approving.value = true
  approveError.value = ''
  try {
    await submitReview(prRef, pull.headSha, 'APPROVE', '')
    approved.value = true
    emit('changed')
  } catch (e) {
    approveError.value = explain(e, 'review')
  } finally {
    approving.value = false
  }
}

// The button names what it will do before anything is loaded: your merge method, and whether AI co-authors are left out.
const label = shallowRef('Merge')
onMounted(async () => {
  const s = await getSettings()
  label.value = s.mergeMethod === 'squash' && s.leaveOutCoAuthors ? 'Merge without AI' : 'Merge'
})

const open = shallowRef(false)
const { plan, mergeable, loading, busy, error, load, submit } = useQuickMerge(prRef)
const action = computed(() => (plan.value ? MERGE_ACTIONS[plan.value.method] : 'Merge'))
watch(open, (value) => value && void load())

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
      <Hint v-if="!isAuthor && approveHold" :text="approveHold">
        <span tabindex="0" class="rounded-md"
          ><Button variant="outline" size="sm" disabled aria-label="Approve"><Check />Approve</Button></span
        >
      </Hint>
      <Button
        v-else-if="!isAuthor"
        :variant="approved || approveError ? 'outline' : 'success'"
        size="sm"
        :class="approved ? 'text-success-fg' : approveError ? 'text-destructive' : ''"
        :disabled="approving || approved"
        :aria-label="approved ? 'Approved' : 'Approve'"
        @click="approve"
      >
        <Spinner v-if="approving" /><Check v-else />{{ approved ? 'Approved' : 'Approve' }}
      </Button>

      <Hint v-if="mergeHold" :text="mergeHold">
        <span tabindex="0" class="rounded-md"
          ><Button variant="outline" size="sm" disabled class="@max-3xl:w-7 @max-3xl:px-0" :aria-label="label"
            ><GitMerge /><span class="@max-3xl:hidden">{{ label }}</span></Button
          ></span
        >
      </Hint>
      <Popover v-else v-model:open="open">
        <Hint :text="`${label} · ${mergeNote}`">
          <PopoverTrigger as-child>
            <Button variant="outline" size="sm" class="relative @max-3xl:w-7 @max-3xl:px-0" :aria-label="label"
              ><span
                class="absolute -top-[3px] -left-[3px] size-2 rounded-full"
                :class="ready ? 'bg-success-fg' : 'bg-attention'"
              /><GitMerge /><span class="@max-3xl:hidden">{{ label }}</span></Button
            >
          </PopoverTrigger>
        </Hint>
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
          <Alert v-else-if="!loading && plan && !mergeable">
            <CircleAlert />
            <AlertDescription
              >GitHub can’t merge this pull request right now. It may need reviews, passing checks or an update.</AlertDescription
            >
          </Alert>
          <div class="flex justify-end gap-2">
            <Button variant="outline" size="sm" @click="open = false">Cancel</Button>
            <Button variant="success" size="sm" :disabled="busy || loading || !mergeable" @click="confirm">
              <Spinner v-if="busy || loading" /><GitMerge v-else />
              {{ action }}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </template>
  </div>
</template>
