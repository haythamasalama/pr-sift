<script setup lang="ts">
import { CircleDot, ExternalLink, MessageSquare } from '@lucide/vue'
import type { IssueItem } from '~/github'
import { formatAgo } from '~/format'
import LabelChip from './LabelChip.vue'

defineProps<{ issue: IssueItem; showRepo?: boolean }>()
</script>

<template>
  <li>
    <a :href="issue.url" target="_blank" rel="noreferrer" class="flex items-start gap-3 px-4 py-2.5 hover:bg-accent/60">
      <CircleDot class="mt-0.5 size-4 shrink-0 text-success" />
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <div class="flex flex-wrap items-center gap-1.5">
          <span v-if="showRepo" class="text-muted-foreground">{{ issue.owner }}/{{ issue.repo }}</span>
          <span class="font-medium">{{ issue.title }}</span>
          <LabelChip v-for="l in issue.labels" :key="l.name" :label="l" />
        </div>
        <div class="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>#{{ issue.number }}</span>
          <span>{{ issue.author?.login ?? 'ghost' }}</span>
          <span>{{ formatAgo(issue.updatedAt) }}</span>
          <span v-if="issue.assignees.length">assigned to {{ issue.assignees.map((a) => a.login).join(', ') }}</span>
        </div>
      </div>
      <span v-if="issue.comments" class="flex items-center gap-1 pt-0.5 text-xs text-muted-foreground"
        ><MessageSquare class="size-3.5" />{{ issue.comments }}</span
      >
      <ExternalLink class="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
    </a>
  </li>
</template>
