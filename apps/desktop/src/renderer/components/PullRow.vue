<script setup lang="ts">
import { computed } from 'vue'
import { MessageSquare } from '@lucide/vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { PullItem } from '~/github'
import { formatAgo } from '~/format'
import LabelChip from './LabelChip.vue'
import Hint from './Hint.vue'
import StatusPill, { type Tone } from './StatusPill.vue'
import QuickActions from './QuickActions.vue'

const props = defineProps<{ pull: PullItem; showRepo?: boolean; me?: string }>()
const emit = defineEmits<{ open: []; changed: [] }>()

const DECISION: Record<string, { text: string; tone: Tone; hint: string }> = {
  APPROVED: { text: 'Approved', tone: 'success', hint: 'A reviewer approved it.' },
  CHANGES_REQUESTED: { text: 'Changes asked', tone: 'danger', hint: 'A reviewer asked for changes before it can merge.' },
  REVIEW_REQUIRED: {
    text: 'Needs review',
    tone: 'attention',
    hint: 'No approving review yet. The repository needs one before it can merge.',
  },
}
const CI: Record<string, { text: string; tone: Tone; hint: string }> = {
  SUCCESS: { text: 'Passed', tone: 'success', hint: 'CI: all checks passed' },
  FAILURE: { text: 'Failed', tone: 'danger', hint: 'CI: some checks failed' },
  ERROR: { text: 'Failed', tone: 'danger', hint: 'CI: some checks could not run' },
  PENDING: { text: 'Running', tone: 'attention', hint: 'CI: checks are still running' },
  EXPECTED: { text: 'Waiting', tone: 'attention', hint: 'CI: checks have not started yet' },
}

// The same review and CI state as the columns, for the narrow layout.
const review = computed<{ text: string; tone: Tone } | undefined>(() => {
  const p = props.pull
  if (p.draft) return { text: 'Draft', tone: 'neutral' }
  if (props.me && p.reviewers.includes(props.me)) return { text: 'Your review', tone: 'info' }
  return p.decision ? DECISION[p.decision] : undefined
})
const ci = computed(() => (props.pull.checks ? CI[props.pull.checks] : undefined))
</script>

<template>
  <li class="flex items-center border-t border-border transition-colors first:border-t-0 hover:bg-secondary">
    <button type="button" class="flex min-w-0 flex-1 items-center gap-3.5 py-3 pr-3.5 pl-5 text-left" @click="emit('open')">
      <div class="flex min-w-0 flex-1 flex-col gap-[3px]">
        <div class="flex min-w-0 items-center gap-2">
          <span v-if="showRepo" class="shrink-0 text-muted-foreground">{{ pull.repo }}</span>
          <span class="truncate text-[13.5px] font-medium" :class="pull.draft ? 'text-muted-foreground' : ''">{{ pull.title }}</span>
          <LabelChip v-for="l in pull.labels" :key="l.name" :label="l" class="hidden shrink-0 @lg:inline-flex" />
          <Hint
            v-if="pull.mergeable === 'CONFLICTING'"
            text="It conflicts with the base branch. The author has to fix that before it can merge."
          >
            <StatusPill tone="danger" :dot="false" class="h-5 text-[11.5px]">Conflicts</StatusPill>
          </Hint>
        </div>
        <div class="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span class="shrink-0 tabular-nums">#{{ pull.number }}</span>
          <span class="flex shrink-0 items-center gap-1.5">
            <Avatar class="size-4"
              ><AvatarImage v-if="pull.author?.avatarUrl" :src="pull.author.avatarUrl" alt="" /><AvatarFallback>{{
                pull.author?.login.slice(0, 1)
              }}</AvatarFallback></Avatar
            >{{ pull.author?.login ?? 'ghost' }}
          </span>
          <span class="truncate font-mono text-faint" :title="`${pull.branch} into ${pull.base}`">{{ pull.branch }}</span>
          <span class="shrink-0">{{ formatAgo(pull.updatedAt) }}</span>
          <span class="shrink-0 tabular-nums"
            ><span class="text-success-fg">+{{ pull.additions }}</span> <span class="text-destructive">−{{ pull.deletions }}</span></span
          >
          <Hint v-if="pull.comments" :text="`${pull.comments} ${pull.comments === 1 ? 'comment' : 'comments'}`">
            <span class="flex shrink-0 items-center gap-1"><MessageSquare class="size-3.5" />{{ pull.comments }}</span>
          </Hint>
        </div>
        <!-- Narrow: the review and CI state sit under the title instead of in their own columns. -->
        <div v-if="review || ci" class="flex items-center gap-2 @2xl:hidden">
          <StatusPill v-if="review" :tone="review.tone">{{ review.text }}</StatusPill>
          <StatusPill v-if="ci" :tone="ci.tone" bare>{{ ci.text }}</StatusPill>
        </div>
      </div>
      <span class="hidden w-[120px] shrink-0 @2xl:block">
        <Hint v-if="pull.draft" text="Draft: the author has not marked it ready for review yet.">
          <StatusPill>Draft</StatusPill>
        </Hint>
        <Hint v-else-if="me && pull.reviewers.includes(me)" text="You were asked to review it.">
          <StatusPill tone="info">Your review</StatusPill>
        </Hint>
        <Hint v-else-if="pull.decision && DECISION[pull.decision]" :text="DECISION[pull.decision]!.hint">
          <StatusPill :tone="DECISION[pull.decision]!.tone">{{ DECISION[pull.decision]!.text }}</StatusPill>
        </Hint>
      </span>
      <span class="hidden w-[70px] shrink-0 @2xl:block">
        <Hint v-if="pull.checks && CI[pull.checks]" :text="CI[pull.checks]!.hint">
          <StatusPill :tone="CI[pull.checks]!.tone" bare>{{ CI[pull.checks]!.text }}</StatusPill>
        </Hint>
      </span>
    </button>
    <QuickActions :key="`${pull.url}@${pull.headSha}`" :pull="pull" class="w-[220px] justify-end pr-5 @max-xl:w-auto" @changed="emit('changed')" />
  </li>
</template>
