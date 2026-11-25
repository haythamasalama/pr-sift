<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  FileText,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
  MessageSquare,
} from '@lucide/vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { PrInfo, PrRef } from '../../lib/types'
import LinkedIssues from './LinkedIssues.vue'
import type { Conversation } from './conversation'

const { info, conversation, pr } = defineProps<{ info: PrInfo | null; conversation: Conversation | null; pr?: PrRef }>()
const panel = defineModel<'description' | 'conversation' | null>('panel', { default: null })
const toggle = (tab: 'description' | 'conversation') => (panel.value = panel.value === tab ? null : tab)

const STATES = {
  open: { label: 'Open', icon: GitPullRequest, tone: 'text-success-fg' },
  draft: { label: 'Draft', icon: GitPullRequestDraft, tone: 'text-muted-foreground' },
  merged: { label: 'Merged', icon: GitMerge, tone: 'text-merged' },
  closed: { label: 'Closed', icon: GitPullRequestClosed, tone: 'text-destructive' },
}

const copied = shallowRef('')
let copiedTimer = 0

async function copyBranch(branch: string) {
  await navigator.clipboard.writeText(branch)
  copied.value = branch
  clearTimeout(copiedTimer)
  copiedTimer = window.setTimeout(() => (copied.value = ''), 1500)
}

const state = computed(() => (info?.state ? STATES[info.state] : null))
const verb = computed(() => (info?.state === 'merged' ? 'merged' : 'wants to merge'))
const commits = computed(() => (info?.commits === undefined ? '' : `${info.commits} commit${info.commits === 1 ? '' : 's'} `))
const comments = computed(() => (conversation?.conversation ?? 0) + (conversation?.code ?? 0))
const commentsTitle = computed(() =>
  conversation
    ? `${comments.value} comments: ${conversation.conversation} in the conversation, ${conversation.code} on the code. Show them here.`
    : '',
)
</script>

<template>
  <div class="flex min-w-0 items-center gap-2 overflow-hidden text-[11px] leading-4 text-muted-foreground">
    <span v-if="state" class="inline-flex shrink-0 items-center gap-1 font-medium" :class="state.tone">
      <component :is="state.icon" class="size-3" />{{ state.label }}
    </span>
    <span v-if="info?.author && info.base && info.head" class="hidden min-w-0 items-center gap-1 truncate md:flex">
      <Avatar class="size-4">
        <AvatarImage v-if="info.authorAvatar" :src="info.authorAvatar" alt="" />
        <AvatarFallback class="text-[8px] uppercase">{{ info.author.slice(0, 1) }}</AvatarFallback>
      </Avatar>
      <span class="truncate">
        <span class="font-medium text-foreground">{{ info.author }}</span>{{ ' ' }}
        <span class="hidden xl:inline">{{ `${verb} ${commits}into ` }}</span>
        <template v-for="(branch, i) in [info.base, info.head]" :key="i">
          <button
            type="button"
            class="inline-flex items-center gap-0.5 rounded-sm bg-emphasis/10 px-1 font-mono text-emphasis hover:bg-emphasis/20"
            :title="copied === branch ? 'Copied' : 'Copy the branch name'"
            :aria-label="`Copy ${branch}`"
            @click="copyBranch(branch)"
          >
            {{ branch }}<Check v-if="copied === branch" class="size-3" />
          </button>
          <template v-if="i === 0">
            <span class="hidden xl:inline">{{ ' from ' }}</span>
            <ArrowLeft class="mx-0.5 inline size-3 align-[-2px] xl:hidden" aria-label="from" />
          </template>
        </template>
      </span>
    </span>
    <LinkedIssues v-if="pr" :key="`${pr.owner}/${pr.repo}#${pr.number}`" :pr="pr" />
    <button
      v-if="conversation"
      type="button"
      class="inline-flex shrink-0 items-center gap-1 hover:text-foreground"
      :class="panel === 'conversation' ? 'text-foreground' : ''"
      :aria-expanded="panel === 'conversation'"
      :title="commentsTitle"
      :aria-label="commentsTitle"
      @click="toggle('conversation')"
    >
      <MessageSquare class="size-3" />{{ comments }}
    </button>
    <button
      type="button"
      class="inline-flex shrink-0 items-center gap-1 hover:text-foreground"
      :class="panel === 'description' ? 'text-foreground' : ''"
      :aria-expanded="panel === 'description'"
      title="Show the pull request description"
      @click="toggle('description')"
    >
      <FileText class="size-3" />Description
      <ChevronDown class="size-3 transition-transform" :class="panel === 'description' ? 'rotate-180' : ''" />
    </button>
  </div>
</template>
