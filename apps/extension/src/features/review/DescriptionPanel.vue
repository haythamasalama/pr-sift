<script setup lang="ts">
import { computed } from 'vue'
import { ExternalLink, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { sanitizeHtml } from './sanitize'

const { html, url } = defineProps<{ html?: string; url: string }>()
const emit = defineEmits<{ close: [] }>()

const safe = computed(() => (html ? sanitizeHtml(html) : ''))
</script>

<template>
  <section aria-label="Pull request description" class="max-h-[45vh] overflow-y-auto border-b bg-background px-4 py-3">
    <div class="mb-2 flex items-center gap-2">
      <h2 class="text-xs font-semibold">Description</h2>
      <span class="flex-1" />
      <Button variant="ghost" size="icon-xs" as-child title="Open the conversation on GitHub" aria-label="Open the conversation on GitHub">
        <a :href="url" target="_blank" rel="noreferrer"><ExternalLink /></a>
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label="Hide the description" @click="emit('close')"><X /></Button>
    </div>
    <div v-if="safe" class="ps-markdown max-w-4xl" v-html="safe" />
    <p v-else class="text-xs text-muted-foreground">No description provided.</p>
  </section>
</template>
