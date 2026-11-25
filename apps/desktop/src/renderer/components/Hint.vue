<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// A short explanation shown on hover or focus, for icons and badges whose meaning is not obvious.
defineProps<{ text: string; side?: 'top' | 'bottom' | 'left' | 'right' }>()
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <slot />
    </TooltipTrigger>
    <TooltipContent :side="side ?? 'top'" class="max-w-64 text-balance">{{ text }}</TooltipContent>
  </Tooltip>
</template>
