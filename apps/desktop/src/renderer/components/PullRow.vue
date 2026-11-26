<script setup lang="ts">
import { computed } from 'vue'
import { MessageSquare } from '@lucide/vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { PullItem } from '~/github'
import { formatAgo } from '~/format'
import LabelChip from './LabelChip.vue'
import Hint from './Hint.vue'
import ProjectIcon from './ProjectIcon.vue'
import StatusPill, { type Tone } from './StatusPill.vue'
import QuickActions from './QuickActions.vue'
import { usePullView } from '~/pulls/view'

// `mine` rows are your own pull requests: the pill says what they need from you instead of the review state.
const props = defineProps<{ pull: PullItem; showRepo?: boolean; me?: string; mine?: boolean }>()
const emit = defineEmits<{ open: []; changed: [] }>()
const { shown } = usePullView()

type State = { text: string; tone: Tone; hint: string }
const DECISION: Record<string, State> = {
  APPROVED: { text: 'Approved', tone: 'success', hint: 'A reviewer approved it.' },
  CHANGES_REQUESTED: { text: 'Changes asked', tone: 'danger', hint: 'A reviewer asked for changes before it can merge.' },
  REVIEW_REQUIRED: {
    text: 'Needs review',
    tone: 'attention',
    hint: 'No approving review yet. The repository needs one before it can merge.',
  },
}
const CI: Record<string, State> = {
  SUCCESS: { text: 'Passed', tone: 'success', hint: 'Checks passed' },
  FAILURE: { text: 'Failed', tone: 'danger', hint: 'Checks failed' },
  ERROR: { text: 'Failed', tone: 'danger', hint: 'Checks failed: some could not run' },
  PENDING: { text: 'Running', tone: 'attention', hint: 'Checks are running' },
  EXPECTED: { text: 'Waiting', tone: 'attention', hint: 'Checks have not started yet' },
}

const review = computed<State | undefined>(() => {
  const p = props.pull
  if (p.draft) return { text: 'Draft', tone: 'neutral', hint: 'Draft: the author has not marked it ready for review yet.' }
  if (props.mine) {
    if (p.decision === 'CHANGES_REQUESTED') return { text: 'Changes asked', tone: 'attention', hint: DECISION.CHANGES_REQUESTED!.hint }
    if (p.checks === 'FAILURE' || p.checks === 'ERROR') return { text: 'Checks failed', tone: 'attention', hint: 'Some checks failed.' }
    if (p.mergeable === 'CONFLICTING') return { text: 'Conflicts', tone: 'attention', hint: 'It conflicts with the base branch.' }
    if (p.decision === 'APPROVED') return DECISION.APPROVED
    return { text: 'Waiting for review', tone: 'neutral', hint: 'Nobody has reviewed it yet.' }
  }
  if (props.me && p.reviewers.includes(props.me)) return { text: 'Your review', tone: 'info', hint: 'You were asked to review it.' }
  return p.decision ? DECISION[p.decision] : undefined
})
const ci = computed(() => (props.pull.checks ? CI[props.pull.checks] : undefined))
const repoProject = computed(() => ({ name: props.pull.repo, github: { owner: props.pull.owner, repo: props.pull.repo } }))
</script>

<template>
  <li class="flex items-center gap-4 border-t border-accent px-4 transition-colors first:border-t-0 hover:bg-muted/60">
    <button type="button" class="flex min-w-0 flex-1 items-center gap-4 py-3 text-left" @click="emit('open')">
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <div class="flex min-w-0 items-center gap-2 overflow-hidden">
          <template v-if="showRepo"
            ><ProjectIcon :project="repoProject" :size="16" /><span class="shrink-0 text-muted-foreground">{{ pull.repo }}</span></template
          >
          <span class="truncate text-sm font-semibold" :class="pull.draft ? 'text-muted-foreground' : ''">{{ pull.title }}</span>
          <template v-if="shown.labels"><LabelChip v-for="l in pull.labels" :key="l.name" :label="l" class="@max-3xl:hidden" /></template>
          <Hint
            v-if="pull.mergeable === 'CONFLICTING' && !mine"
            text="It conflicts with the base branch. The author has to fix that first."
          >
            <StatusPill tone="danger">Conflicts</StatusPill>
          </Hint>
        </div>
        <div class="flex min-w-0 items-center gap-2 overflow-hidden text-xs whitespace-nowrap text-muted-foreground">
          <span class="shrink-0 tabular-nums">#{{ pull.number }}</span>
          <!-- In a narrow list the review status moves here, so the title keeps its room. -->
          <Hint v-if="shown.review && review" :text="review.hint">
            <StatusPill :tone="review.tone" class="hidden h-4 px-1.5 text-[11px] @max-3xl:inline-flex">{{ review.text }}</StatusPill>
          </Hint>
          <span v-if="!mine && shown.author" class="flex shrink-0 items-center gap-1.5">
            <Avatar class="size-4"
              ><AvatarImage v-if="pull.author?.avatarUrl" :src="pull.author.avatarUrl" alt="" /><AvatarFallback
                class="text-[9px] uppercase"
                >{{ pull.author?.login.slice(0, 1) }}</AvatarFallback
              ></Avatar
            >{{ pull.author?.login ?? 'ghost' }}
          </span>
          <span v-if="shown.branch" class="truncate font-mono text-[11px] @max-3xl:hidden" :title="`${pull.branch} into ${pull.base}`">{{
            pull.branch
          }}</span>
          <span class="shrink-0">{{ formatAgo(pull.updatedAt) }}</span>
          <span v-if="shown.size" class="shrink-0 tabular-nums"
            ><span class="text-success-fg">+{{ pull.additions }}</span> <span class="text-destructive">−{{ pull.deletions }}</span></span
          >

          <span v-if="pull.comments && shown.comments" class="flex shrink-0 items-center gap-1"
            ><MessageSquare class="size-3.5" />{{ pull.comments }}</span
          >
        </div>
      </div>
      <span v-if="shown.review" class="flex w-[calc(18ch+1.5rem)] shrink-0 text-xs @max-3xl:hidden" :class="mine ? 'justify-end' : ''">
        <Hint v-if="review" :text="review.hint">
          <StatusPill :tone="review.tone">{{ review.text }}</StatusPill>
        </Hint>
      </span>
      <!-- Checks are a dot; the word is in the hint. -->
      <span v-if="shown.ci" class="flex w-14 shrink-0 justify-center">
        <Hint v-if="ci" :text="ci.hint">
          <StatusPill :tone="ci.tone" bare :aria-label="ci.hint" class="gap-0"
            ><span class="sr-only">{{ ci.text }}</span></StatusPill
          >
        </Hint>
      </span>
    </button>
    <QuickActions
      :key="`${pull.url}@${pull.headSha}`"
      :pull="pull"
      class="w-[256px] justify-end @max-3xl:w-auto @5xl:w-[332px]"
      @changed="emit('changed')"
    />
  </li>
</template>
