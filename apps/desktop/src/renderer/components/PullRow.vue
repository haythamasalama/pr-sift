<script setup lang="ts">
import { CircleCheck, CircleDot, CircleX, GitPullRequest, GitPullRequestDraft, MessageSquare } from '@lucide/vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { PullItem } from '~/github'
import { formatAgo } from '~/format'
import LabelChip from './LabelChip.vue'

defineProps<{ pull: PullItem; showRepo?: boolean; me?: string }>()
const emit = defineEmits<{ open: [] }>()

const DECISION: Record<string, { text: string; cls: string }> = {
  APPROVED: { text: 'Approved', cls: 'border-success/50 text-success' },
  CHANGES_REQUESTED: { text: 'Changes requested', cls: 'border-destructive/50 text-destructive' },
  REVIEW_REQUIRED: { text: 'Review required', cls: 'border-attention/50 text-attention' },
}
</script>

<template>
  <li>
    <button type="button" class="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-accent/60" @click="emit('open')">
      <GitPullRequestDraft v-if="pull.draft" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <GitPullRequest v-else class="mt-0.5 size-4 shrink-0 text-success" />
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
          <span class="truncate font-mono">{{ pull.branch }} → {{ pull.base }}</span>
          <span>{{ formatAgo(pull.updatedAt) }}</span>
          <span class="tabular-nums"
            ><span class="text-success">+{{ pull.additions }}</span> <span class="text-destructive">−{{ pull.deletions }}</span></span
          >
          <span v-if="me && pull.reviewers.includes(me)" class="font-medium text-attention">Waiting for you</span>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2 pt-0.5">
        <Badge v-if="pull.draft" variant="outline">Draft</Badge>
        <Badge v-else-if="pull.decision && DECISION[pull.decision]" variant="outline" :class="DECISION[pull.decision]!.cls">{{
          DECISION[pull.decision]!.text
        }}</Badge>
        <Badge v-if="pull.mergeable === 'CONFLICTING'" variant="outline" class="border-destructive/50 text-destructive">Conflicts</Badge>
        <span v-if="pull.comments" class="flex items-center gap-1 text-xs text-muted-foreground"
          ><MessageSquare class="size-3.5" />{{ pull.comments }}</span
        >
        <CircleCheck v-if="pull.checks === 'SUCCESS'" class="size-4 text-success" aria-label="Checks passed" />
        <CircleX
          v-else-if="pull.checks === 'FAILURE' || pull.checks === 'ERROR'"
          class="size-4 text-destructive"
          aria-label="Checks failed"
        />
        <CircleDot v-else-if="pull.checks" class="size-4 text-attention" aria-label="Checks running" />
      </div>
    </button>
  </li>
</template>
