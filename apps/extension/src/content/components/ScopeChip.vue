<script setup lang="ts">
import { Button } from '@/components/ui/button'

defineProps<{ label: string; count?: number; active?: boolean; hint?: string }>()
</script>

<template>
  <Button size="xs" :variant="active ? 'default' : 'outline'" :title="hint">
    <span class="truncate">{{ label }}</span>
    <span v-if="count !== undefined" class="opacity-60">{{ count }}</span>
  </Button>
</template>
