<script setup lang="ts">
import { GitBranch } from '@lucide/vue'

// One look for a branch name everywhere: a quiet mono pill, cut short with the full name on hover,
// and a link to the branch on GitHub when there is one.
const { name, href, size = 'sm' } = defineProps<{ name: string; href?: string; size?: 'xs' | 'sm' }>()
</script>

<template>
  <component
    :is="href ? 'a' : 'span'"
    :href="href"
    :target="href ? '_blank' : undefined"
    :rel="href ? 'noreferrer' : undefined"
    :title="href ? `${name} · Open on GitHub` : name"
    class="inline-flex max-w-full min-w-0 items-center gap-1 rounded-md border border-border bg-secondary/70 font-mono text-muted-foreground"
    :class="[
      size === 'xs' ? 'h-5 px-1.5 text-[11px]' : 'h-6 px-2 text-xs',
      href ? 'transition-colors hover:border-emphasis/50 hover:text-emphasis' : '',
    ]"
    @click="href && $event.stopPropagation()"
  >
    <GitBranch class="shrink-0" :class="size === 'xs' ? 'size-3' : 'size-3.5'" />
    <span class="truncate">{{ name }}</span>
  </component>
</template>
