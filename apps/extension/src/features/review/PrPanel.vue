<script setup lang="ts">
import { computed } from 'vue'
import { ExternalLink, FileText, MessageSquare, X } from '@lucide/vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Conversation, Thread } from './conversation'
import GithubComment from './GithubComment.vue'
import { plainText, sanitizeHtml } from './sanitize'

const { html, url, conversation } = defineProps<{ html?: string; url: string; conversation: Conversation | null }>()
const tab = defineModel<'description' | 'conversation'>('tab', { required: true })
const emit = defineEmits<{ close: []; jump: [thread: Thread] }>()

const description = computed(() => (html ? sanitizeHtml(html) : ''))
const threads = computed(() => [...(conversation?.threads.values() ?? [])].flat())
const total = computed(() => (conversation ? conversation.discussion.length + threads.value.length : 0))
const preview = (thread: Thread) => plainText(thread.comments[0]?.bodyHtml ?? '')
</script>

<template>
  <section aria-label="Pull request" class="flex max-h-[45vh] min-h-0 flex-col border-b bg-background">
    <Tabs v-model="tab" class="min-h-0 flex-1 gap-0">
      <div class="flex items-center gap-2 border-b px-4 py-1.5">
        <TabsList>
          <TabsTrigger value="description"><FileText /> Description</TabsTrigger>
          <TabsTrigger value="conversation">
            <MessageSquare /> Conversation
            <Badge v-if="total" variant="secondary" class="h-4 min-w-4 px-1 text-[10px] tabular-nums">{{ total }}</Badge>
          </TabsTrigger>
        </TabsList>
        <span class="flex-1" />
        <Button
          variant="ghost"
          size="icon-xs"
          as-child
          title="Open the conversation on GitHub"
          aria-label="Open the conversation on GitHub"
        >
          <a :href="url" target="_blank" rel="noreferrer"><ExternalLink /></a>
        </Button>
        <Button variant="ghost" size="icon-xs" aria-label="Hide" title="Hide" @click="emit('close')"><X /></Button>
      </div>

      <TabsContent value="description" class="min-h-0 overflow-y-auto px-4 py-3">
        <div v-if="description" class="ps-markdown max-w-4xl" v-html="description" />
        <p v-else class="text-xs text-muted-foreground">No description provided.</p>
      </TabsContent>

      <TabsContent value="conversation" class="min-h-0 overflow-y-auto px-4 py-3">
        <p v-if="!conversation" class="text-xs text-muted-foreground">Add a GitHub token in Settings to read the comments here.</p>
        <p v-else-if="!total" class="text-xs text-muted-foreground">No comments yet.</p>
        <div v-else class="flex max-w-4xl flex-col gap-4">
          <GithubComment v-for="c in conversation.discussion" :key="c.id" :comment="c" />
          <div v-if="threads.length" class="flex flex-col gap-2">
            <h3 class="text-xs font-semibold">On the code</h3>
            <ul class="flex flex-col divide-y rounded-md border">
              <li v-for="t in threads" :key="t.id">
                <button
                  type="button"
                  class="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-muted"
                  :title="`Go to ${t.path}, line ${t.line}`"
                  @click="emit('jump', t)"
                >
                  <Avatar size="sm" class="mt-0.5">
                    <AvatarImage v-if="t.comments[0]?.avatar" :src="t.comments[0].avatar" alt="" />
                    <AvatarFallback class="text-[10px] uppercase">{{ t.comments[0]?.author.slice(0, 2) }}</AvatarFallback>
                  </Avatar>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-mono text-[11px] text-muted-foreground">{{ t.path }}:{{ t.line }}</span>
                    <span class="line-clamp-2 text-xs"
                      ><span class="font-semibold">{{ t.comments[0]?.author }}</span> {{ preview(t) }}</span
                    >
                  </span>
                  <span class="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground"
                    ><MessageSquare class="size-3" />{{ t.comments.length }}</span
                  >
                </button>
              </li>
            </ul>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  </section>
</template>
