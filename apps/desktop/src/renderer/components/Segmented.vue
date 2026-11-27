<script setup lang="ts" generic="T extends string">
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import CountBadge from './CountBadge.vue'

// The kit's toggle group without borders: the chosen option gets the accent fill, each count sits in a badge.
const model = defineModel<T>({ required: true })
defineProps<{ options: { value: T; label: string; count?: number; dot?: string }[]; label: string }>()
</script>

<template>
  <ToggleGroup
    type="single"
    size="sm"
    :spacing="0.5"
    class="max-w-full shrink-0 overflow-x-auto [scrollbar-width:none]"
    :model-value="model"
    :aria-label="label"
    @update:model-value="(v) => v && (model = v as T)"
  >
    <ToggleGroupItem v-for="o in options" :key="o.value" :value="o.value" class="text-xs">
      <span v-if="o.dot" class="size-[7px] rounded-full" :class="o.dot" />{{ o.label
      }}<CountBadge v-if="o.count !== undefined" class="ml-0.5">{{ o.count }}</CountBadge>
    </ToggleGroupItem>
  </ToggleGroup>
</template>
