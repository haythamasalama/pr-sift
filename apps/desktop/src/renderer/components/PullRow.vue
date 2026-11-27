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
const { shown, density } = usePullView()
const compact = computed(() => density.value === 'compact')

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
    <button
      type="button"
      class="flex min-w-0 flex-1 items-center gap-4 text-left"
      :class="compact ? 'py-1.5' : 'py-2.5'"
      @click="emit('open')"
    >
      <div class="flex min-w-0 flex-1 flex-col" :class="compact ? 'gap-0.5' : 'gap-1'">
        <!-- Line one is the title alone, as GitHub lists them; where it lives goes underneath. -->
        <div class="flex min-w-0 items-center gap-2 overflow-hidden">
          <span
            class="truncate font-semibold"
            :class="[compact ? 'text-[13px] leading-[18px]' : 'text-[15px] leading-5', pull.draft ? 'text-muted-foreground' : '']"
            >{{ pull.title }}</span
          >
          <template v-if="shown.labels"><LabelChip v-for="l in pull.labels" :key="l.name" :label="l" class="@max-3xl:hidden" /></template>
          <Hint
            v-if="pull.mergeable === 'CONFLICTING' && !mine"
            text="It conflicts with the base branch. The author has to fix that first."
          >
            <StatusPill tone="danger">Conflicts</StatusPill>
          </Hint>
        </div>
        <div
          class="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-muted-foreground"
          :class="compact ? 'text-[11px]' : 'text-xs'"
        >
          <span class="flex shrink-0 items-center gap-1.5 tabular-nums" :title="`${pull.branch} into ${pull.base}`">
            <template v-if="showRepo"><ProjectIcon :project="repoProject" :size="14" />{{ pull.owner }}/{{ pull.repo }}</template
            >#{{ pull.number }}
          </span>
          <!-- In a narrow list the status moves here, so the title keeps its room. -->
          <span v-if="(shown.review && review) || (shown.ci && ci)" class="hidden items-center gap-1.5 @max-3xl:flex">
            <StatusPill v-if="shown.ci && ci" :tone="ci.tone" bare :aria-label="ci.hint" class="gap-0"
              ><span class="sr-only">{{ ci.text }}</span></StatusPill
            >
            <StatusPill v-if="shown.review && review" :tone="review.tone" class="h-4 px-1.5 text-[11px]">{{ review.text }}</StatusPill>
          </span>
          <span v-if="!mine && shown.author" class="flex shrink-0 items-center gap-1.5">
            <Avatar class="size-4"
              ><AvatarImage v-if="pull.author?.avatarUrl" :src="pull.author.avatarUrl" alt="" /><AvatarFallback
                class="text-[9px] uppercase"
                >{{ pull.author?.login.slice(0, 1) }}</AvatarFallback
              ></Avatar
            >{{ pull.author?.login ?? 'ghost' }}
          </span>
          <span v-if="shown.branch" class="min-w-[8ch] truncate font-mono text-[11px]">{{ pull.branch }}</span>
          <span v-if="shown.time" class="shrink-0" :title="new Date(pull.updatedAt).toLocaleString()">{{ formatAgo(pull.updatedAt) }}</span>
          <span v-if="shown.size" class="shrink-0 tabular-nums"
            ><span class="text-success-fg">+{{ pull.additions }}</span> <span class="text-destructive">−{{ pull.deletions }}</span></span
          >
          <span v-if="pull.comments && shown.comments" class="flex shrink-0 items-center gap-1"
            ><MessageSquare class="size-3.5" />{{ pull.comments }}</span
          >
        </div>
      </div>
      <!-- One status column: the checks dot, then where the review stands. The words are in the hints. -->
      <span v-if="shown.review || shown.ci" class="flex w-[calc(18ch+2.5rem)] shrink-0 items-center gap-2 text-xs @max-3xl:hidden">
        <span v-if="shown.ci" class="flex w-3 shrink-0 justify-center">
          <Hint v-if="ci" :text="ci.hint">
            <StatusPill :tone="ci.tone" bare :aria-label="ci.hint" class="gap-0"
              ><span class="sr-only">{{ ci.text }}</span></StatusPill
            >
          </Hint>
        </span>
        <Hint v-if="shown.review && review" :text="review.hint">
          <StatusPill :tone="review.tone">{{ review.text }}</StatusPill>
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
