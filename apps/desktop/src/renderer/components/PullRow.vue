<script setup lang="ts">
import { CircleCheck, CircleDot, CircleX, GitPullRequest, GitPullRequestDraft, MessageSquare } from '@lucide/vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { PullItem } from '~/github'
import { formatAgo } from '~/format'
import LabelChip from './LabelChip.vue'
import BranchName from './BranchName.vue'
import Hint from './Hint.vue'

defineProps<{ pull: PullItem; showRepo?: boolean; me?: string }>()
const emit = defineEmits<{ open: [] }>()

const DECISION: Record<string, { text: string; cls: string; hint: string }> = {
  APPROVED: { text: 'Approved', cls: 'border-success/50 text-success', hint: 'A reviewer approved it.' },
  CHANGES_REQUESTED: {
    text: 'Changes requested',
    cls: 'border-destructive/50 text-destructive',
    hint: 'A reviewer asked for changes before it can merge.',
  },
  REVIEW_REQUIRED: {
    text: 'Needs review',
    cls: 'border-attention/50 text-attention',
    hint: 'No approving review yet. The repository needs one before it can merge.',
  },
}
</script>

<template>
  <li>
    <button type="button" class="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-accent/60" @click="emit('open')">
      <Hint :text="pull.draft ? 'Draft: the author has not marked it ready for review' : 'Open pull request'" side="right">
        <span class="mt-0.5 shrink-0">
          <GitPullRequestDraft v-if="pull.draft" class="size-4 text-muted-foreground" />
          <GitPullRequest v-else class="size-4 text-success" />
        </span>
      </Hint>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <div class="flex flex-wrap items-center gap-1.5">
          <span v-if="showRepo" class="text-muted-foreground">{{ pull.owner }}/{{ pull.repo }}</span>
          <span class="font-medium">{{ pull.title }}</span>
          <LabelChip v-for="l in pull.labels" :key="l.name" :label="l" />
        </div>
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>#{{ pull.number }}</span>
          <span class="flex items-center gap-1">
            <Avatar class="size-4"
              ><AvatarImage v-if="pull.author?.avatarUrl" :src="pull.author.avatarUrl" alt="" /><AvatarFallback>{{
                pull.author?.login.slice(0, 1)
              }}</AvatarFallback></Avatar
            >
            {{ pull.author?.login ?? 'ghost' }}
          </span>
          <span class="flex min-w-0 items-center gap-1"
            ><BranchName :name="pull.branch" size="xs" /><span aria-label="into">→</span><BranchName :name="pull.base" size="xs"
          /></span>
          <span>{{ formatAgo(pull.updatedAt) }}</span>
          <span class="tabular-nums"
            ><span class="text-success">+{{ pull.additions }}</span> <span class="text-destructive">−{{ pull.deletions }}</span></span
          >
          <span v-if="me && pull.reviewers.includes(me)" class="font-medium text-attention">Waiting for you</span>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2 pt-0.5">
        <Hint v-if="pull.draft" text="Draft: the author has not marked it ready for review yet.">
          <Badge variant="outline">Draft</Badge>
        </Hint>
        <Hint v-else-if="pull.decision && DECISION[pull.decision]" :text="DECISION[pull.decision]!.hint">
          <Badge variant="outline" :class="DECISION[pull.decision]!.cls">{{ DECISION[pull.decision]!.text }}</Badge>
        </Hint>
        <Hint
          v-if="pull.mergeable === 'CONFLICTING'"
          text="It conflicts with the base branch. The author has to fix that before it can merge."
        >
          <Badge variant="outline" class="border-destructive/50 text-destructive">Conflicts</Badge>
        </Hint>
        <Hint v-if="pull.comments" :text="`${pull.comments} ${pull.comments === 1 ? 'comment' : 'comments'}`">
          <span class="flex items-center gap-1 text-xs text-muted-foreground"><MessageSquare class="size-3.5" />{{ pull.comments }}</span>
        </Hint>
        <Hint v-if="pull.checks === 'SUCCESS'" text="CI: all checks passed">
          <span class="flex items-center gap-1 text-xs text-success"><CircleCheck class="size-4" /> CI</span>
        </Hint>
        <Hint v-else-if="pull.checks === 'FAILURE' || pull.checks === 'ERROR'" text="CI: some checks failed">
          <span class="flex items-center gap-1 text-xs text-destructive"><CircleX class="size-4" /> CI</span>
        </Hint>
        <Hint v-else-if="pull.checks" text="CI: checks are still running">
          <span class="flex items-center gap-1 text-xs text-attention"><CircleDot class="size-4" /> CI</span>
        </Hint>
      </div>
    </button>
  </li>
</template>
