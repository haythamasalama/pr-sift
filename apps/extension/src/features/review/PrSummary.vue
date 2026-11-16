<script setup lang="ts">
import { computed } from 'vue'
import { ChevronDown, FileText, GitMerge, GitPullRequest, GitPullRequestClosed, GitPullRequestDraft, MessageSquare } from '@lucide/vue'
import type { PrInfo } from '../../lib/types'
import type { Conversation } from './conversation'

const { info, conversation, conversationUrl } = defineProps<{
  info: PrInfo | null
  conversation: Conversation | null
  conversationUrl: string
}>()
const descriptionOpen = defineModel<boolean>('descriptionOpen', { default: false })

const STATES = {
  open: { label: 'Open', icon: GitPullRequest, tone: 'text-success' },
  draft: { label: 'Draft', icon: GitPullRequestDraft, tone: 'text-muted-foreground' },
  merged: { label: 'Merged', icon: GitMerge, tone: 'text-merged' },
  closed: { label: 'Closed', icon: GitPullRequestClosed, tone: 'text-destructive' },
}

const state = computed(() => (info?.state ? STATES[info.state] : null))
const verb = computed(() => (info?.state === 'merged' ? 'merged' : 'wants to merge'))
const commits = computed(() => (info?.commits === undefined ? '' : `${info.commits} commit${info.commits === 1 ? '' : 's'} `))
const comments = computed(() => (conversation ? conversation.conversation + conversation.code : 0))
const commentsTitle = computed(() =>
  conversation
    ? `${comments.value} comments on GitHub: ${conversation.conversation} in the conversation, ${conversation.code} on the code`
    : '',
)
</script>

<template>
  <div class="flex min-w-0 items-center gap-1.5 text-[11px] leading-4 text-muted-foreground">
    <span v-if="state" class="inline-flex shrink-0 items-center gap-1 font-medium" :class="state.tone">
      <component :is="state.icon" class="size-3" />{{ state.label }}
    </span>
    <span v-if="info?.author && info.base && info.head" class="hidden min-w-0 truncate md:inline">
      <span class="font-medium text-foreground">{{ info.author }}</span> {{ verb }} {{ commits }}into
      <code class="rounded-sm bg-emphasis/10 px-1 font-mono text-emphasis">{{ info.base }}</code> from
      <code class="rounded-sm bg-emphasis/10 px-1 font-mono text-emphasis">{{ info.head }}</code>
    </span>
    <a
      v-if="conversation"
      :href="conversationUrl"
      target="_blank"
      rel="noreferrer"
      class="inline-flex shrink-0 items-center gap-1 hover:text-foreground"
      :title="commentsTitle"
      :aria-label="commentsTitle"
    >
      <MessageSquare class="size-3" />{{ comments }}
    </a>
    <button
      type="button"
      class="inline-flex shrink-0 items-center gap-1 hover:text-foreground"
      :class="descriptionOpen ? 'text-foreground' : ''"
      :aria-expanded="descriptionOpen"
      title="Show the pull request description"
      @click="descriptionOpen = !descriptionOpen"
    >
      <FileText class="size-3" />Description
      <ChevronDown class="size-3 transition-transform" :class="descriptionOpen ? 'rotate-180' : ''" />
    </button>
  </div>
</template>
