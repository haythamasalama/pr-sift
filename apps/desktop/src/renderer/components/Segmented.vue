<script setup lang="ts" generic="T extends string">
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

// The extension's toggle group with a count beside each label.
const model = defineModel<T>({ required: true })
defineProps<{ options: { value: T; label: string; count?: number }[]; label: string }>()
</script>

<template>
  <ToggleGroup
    type="single"
    variant="outline"
    size="sm"
    class="max-w-full shrink-0 overflow-x-auto [scrollbar-width:none]"
    :model-value="model"
    :aria-label="label"
    @update:model-value="(v) => v && (model = v as T)"
  >
    <ToggleGroupItem v-for="o in options" :key="o.value" :value="o.value">
      {{ o.label }}<span v-if="o.count !== undefined" class="text-muted-foreground tabular-nums">{{ o.count }}</span>
    </ToggleGroupItem>
  </ToggleGroup>
</template>
