<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'

// One status look across the app, built on the extension's Badge: tinted text and a dot, or just the dot and text when `bare`.
export type Tone = 'success' | 'attention' | 'danger' | 'info' | 'neutral'
const { tone = 'neutral', dot = undefined, bare = false } = defineProps<{ tone?: Tone; dot?: boolean; bare?: boolean }>()
// Neutral badges go without a dot unless asked; every coloured one has one.
const showDot = computed(() => dot ?? tone !== 'neutral')

const TEXT: Record<Tone, string> = {
  success: 'text-success-fg',
  attention: 'text-attention',
  danger: 'text-destructive',
  info: 'text-emphasis',
  neutral: 'text-muted-foreground',
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
  <Badge :variant="bare ? 'ghost' : 'secondary'" :class="[TEXT[tone], bare ? 'px-0 hover:bg-transparent' : '']">
    <span v-if="showDot" class="size-1.5 shrink-0 rounded-full" :class="DOT[tone]" />
    <slot />
  </Badge>
</template>
