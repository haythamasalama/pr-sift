<script setup lang="ts">
import StatusPill, { type Tone } from './StatusPill.vue'

// A page's name, with a few short facts beside it as pills instead of a sentence.
export type PageTag = string | { text: string; tone?: Tone }
defineProps<{ title: string; tags?: PageTag[] }>()
const text = (t: PageTag) => (typeof t === 'string' ? t : t.text)
const tone = (t: PageTag) => (typeof t === 'string' ? 'neutral' : (t.tone ?? 'neutral'))
</script>

<template>
  <header class="sticky top-0 z-10 flex min-h-16 flex-wrap items-center gap-3 border-b border-border bg-background px-8 py-2.5">
    <slot name="before" />
    <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
      <h1 class="text-base leading-[22px] font-semibold">{{ title }}</h1>
      <StatusPill v-for="t in tags" :key="text(t)" :tone="tone(t)" class="text-[11px] tabular-nums">{{ text(t) }}</StatusPill>
    </div>
    <div class="flex items-center gap-2"><slot /></div>
  </header>
</template>
