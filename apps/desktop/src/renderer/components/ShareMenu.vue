<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef } from 'vue'
import { AppWindow, Check, ExternalLink, Link, Share2, TextQuote } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { appPullUrl, githubPullUrl, type PullLink } from '#shared/links'

// The app has no address bar, so this is how a pull request is passed on to someone: as GitHub's link,
// as a PR Sift link that opens it in their app, or as Markdown for a chat or a note.
const { pr, title } = defineProps<{ pr: PullLink; title?: string }>()

const github = computed(() => githubPullUrl(pr))
const copied = shallowRef('')
let timer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(timer))

async function copy(what: string, text: string) {
  await navigator.clipboard.writeText(text)
  copied.value = what
  clearTimeout(timer)
  timer = setTimeout(() => (copied.value = ''), 1800)
}
const markdown = () => `[#${pr.number}${title ? ` ${title}` : ''}](${github.value})`
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="shrink-0 text-muted-foreground" title="Share" aria-label="Share">
        <Check v-if="copied" class="text-success-fg" /><Share2 v-else />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-64">
      <DropdownMenuLabel class="text-xs">Share #{{ pr.number }}</DropdownMenuLabel>
      <DropdownMenuItem @select="copy('GitHub link', github)"><Link /> Copy GitHub link</DropdownMenuItem>
      <DropdownMenuItem class="items-start" @select="copy('PR Sift link', appPullUrl(pr))">
        <AppWindow class="mt-0.5" />
        <span class="flex flex-col">
          <span>Copy PR Sift link</span>
          <span class="text-[11px] text-muted-foreground">Opens it in the app for anyone who has it</span>
        </span>
      </DropdownMenuItem>
      <DropdownMenuItem @select="copy('Markdown', markdown())"><TextQuote /> Copy as Markdown</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem as="a" :href="github" target="_blank" rel="noreferrer"><ExternalLink /> Open on GitHub</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
  <span class="sr-only" aria-live="polite">{{ copied ? `${copied} copied` : '' }}</span>
</template>
