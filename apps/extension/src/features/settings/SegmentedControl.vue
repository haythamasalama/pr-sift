<script setup lang="ts" generic="T extends string">
import type { Component } from 'vue'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const { options, label, name } = defineProps<{
  options: { value: T; label: string; hint?: string; icon?: Component }[]
  label: string
  name: string
}>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <ToggleGroup
    type="single"
    size="sm"
    :model-value="model"
    :aria-label="label"
    class="gap-0.5 rounded-lg border bg-muted p-0.5"
    @update:model-value="(v) => v && (model = v as T)"
  >
    <ToggleGroupItem
      v-for="o in options"
      :id="`${name}-${o.value}`"
      :key="o.value"
      :value="o.value"
      :title="o.hint"
      class="data-[state=on]:bg-background data-[state=on]:shadow-xs data-[state=on]:ring-1 data-[state=on]:ring-border"
    >
      <component :is="o.icon" v-if="o.icon" />{{ o.label }}
    </ToggleGroupItem>
  </ToggleGroup>
</template>
