<script setup lang="ts">
import { Badge } from '@/components/ui/badge'

// One status look across the app, built on the kit's Badge: a soft fill in the status colour.
// `bare` drops the fill and leads with a dot instead, for columns such as CI.
export type Tone = 'success' | 'attention' | 'danger' | 'info' | 'merged' | 'neutral'
const { tone = 'neutral', bare = false } = defineProps<{ tone?: Tone; bare?: boolean }>()

const FILL: Record<Tone, string> = {
  success: 'bg-add-bg text-success-fg',
  attention: 'bg-attention/15 text-attention',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-emphasis/15 text-emphasis',
  merged: 'bg-merged/15 text-merged',
  neutral: 'bg-muted text-muted-foreground',
}
const TEXT: Record<Tone, string> = {
  success: 'text-success-fg',
  attention: 'text-attention',
  danger: 'text-destructive',
  info: 'text-emphasis',
  merged: 'text-merged',
  neutral: 'text-muted-foreground',
}
const DOT: Record<Tone, string> = {
  success: 'bg-success-fg',
  attention: 'bg-attention',
  danger: 'bg-destructive',
  info: 'bg-emphasis',
  merged: 'bg-merged',
  neutral: 'bg-muted-foreground',
}
</script>

<template>
  <span v-if="bare" class="inline-flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap" :class="TEXT[tone]">
    <span class="size-[7px] shrink-0 rounded-full" :class="DOT[tone]" /><slot />
  </span>
  <Badge v-else variant="secondary" class="font-normal" :class="FILL[tone]"><slot /></Badge>
</template>
