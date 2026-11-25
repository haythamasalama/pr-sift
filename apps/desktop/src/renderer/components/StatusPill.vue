<script setup lang="ts">
// The one status look across the app: a soft tinted pill with a dot, or just the dot and text when `bare`.
export type Tone = 'success' | 'attention' | 'danger' | 'info' | 'neutral'
import { computed } from 'vue'
const { tone = 'neutral', dot = undefined, bare = false } = defineProps<{ tone?: Tone; dot?: boolean; bare?: boolean }>()
// Neutral pills go without a dot unless asked; every coloured one has one.
const showDot = computed(() => dot ?? tone !== 'neutral')

const TEXT: Record<Tone, string> = {
  success: 'text-success-fg',
  attention: 'text-attention',
  danger: 'text-destructive',
  info: 'text-emphasis',
  neutral: 'text-muted-foreground',
}
const FILL: Record<Tone, string> = {
  success: 'bg-success-fg/12',
  attention: 'bg-attention/12',
  danger: 'bg-destructive/12',
  info: 'bg-emphasis/12',
  neutral: 'bg-accent',
}
const DOT: Record<Tone, string> = {
  success: 'bg-success-fg',
  attention: 'bg-attention',
  danger: 'bg-destructive',
  info: 'bg-emphasis',
  neutral: 'bg-muted-foreground',
}
</script>

<template>
  <span
    class="inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full text-xs font-medium whitespace-nowrap"
    :class="[TEXT[tone], bare ? '' : ['px-2', FILL[tone]]]"
  >
    <span v-if="showDot" class="size-1.5 shrink-0 rounded-full" :class="DOT[tone]" />
    <slot />
  </span>
</template>
