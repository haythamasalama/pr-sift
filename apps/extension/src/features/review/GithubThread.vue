<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ChevronDown, ExternalLink, MessageSquare } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { Thread } from './conversation'
import GithubComment from './GithubComment.vue'

const { thread } = defineProps<{ thread: Thread }>()

const open = shallowRef(true)
const lines = computed(() =>
  thread.startLine && thread.startLine < thread.line ? `Lines ${thread.startLine}–${thread.line}` : `Line ${thread.line}`,
)
const replies = computed(() => thread.comments.slice(1))
const count = computed(() => `${thread.comments.length} comment${thread.comments.length === 1 ? '' : 's'}`)
</script>

<template>
  <section :data-thread="thread.id" class="border-y bg-muted/50 font-sans">
    <div class="flex items-center gap-2 px-3 py-1.5 text-[11px] text-muted-foreground">
      <button type="button" class="flex min-w-0 flex-1 items-center gap-1.5 text-left hover:text-foreground" @click="open = !open">
        <MessageSquare class="size-3.5 shrink-0" />
        <span class="font-medium text-foreground">{{ lines }}</span>
        <span>· {{ count }} on GitHub</span>
        <ChevronDown class="size-3.5 transition-transform" :class="open ? '' : '-rotate-90'" />
      </button>
      <Button variant="ghost" size="icon-xs" as-child title="Open this thread on GitHub" aria-label="Open this thread on GitHub">
        <a :href="thread.comments[0]?.url" target="_blank" rel="noreferrer"><ExternalLink /></a>
      </Button>
    </div>
    <div v-if="open && thread.comments[0]" class="flex flex-col gap-3 px-3 pb-3">
      <GithubComment :comment="thread.comments[0]" />
      <div v-if="replies.length" data-replies class="ml-3 flex flex-col gap-3 border-l pl-5">
        <GithubComment v-for="c in replies" :key="c.id" :comment="c" />
      </div>
    </div>
  </section>
</template>
