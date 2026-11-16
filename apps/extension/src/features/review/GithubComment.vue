<script setup lang="ts">
import { computed } from 'vue'
import { timeAgo } from '@pr-sift/core'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { GithubComment } from './conversation'
import { sanitizeHtml } from './sanitize'

const { comment } = defineProps<{ comment: GithubComment }>()

const body = computed(() => sanitizeHtml(comment.bodyHtml))
const when = computed(() => timeAgo(comment.createdAt))
</script>

<template>
  <article class="flex min-w-0 gap-2.5">
    <Avatar size="sm" class="mt-0.5">
      <AvatarImage v-if="comment.avatar" :src="comment.avatar" alt="" />
      <AvatarFallback class="text-[10px] uppercase">{{ comment.author.slice(0, 2) }}</AvatarFallback>
    </Avatar>
    <div class="min-w-0 flex-1">
      <p class="flex flex-wrap items-center gap-x-1.5 text-xs">
        <span class="font-semibold">{{ comment.author }}</span>
        <Badge v-if="comment.verdict === 'approved'" variant="outline" class="border-success-fg/40 text-success-fg">Approved</Badge>
        <Badge v-else-if="comment.verdict === 'changes_requested'" variant="outline" class="border-destructive/40 text-destructive"
          >Requested changes</Badge
        >
        <time class="text-muted-foreground" :datetime="comment.createdAt" :title="new Date(comment.createdAt).toLocaleString()">{{
          when
        }}</time>
      </p>
      <div v-if="body" class="ps-markdown mt-0.5 text-xs" v-html="body" />
    </div>
  </article>
</template>
