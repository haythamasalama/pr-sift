<script setup lang="ts">
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '@/components/ui/field'

const {
  label,
  description,
  controlId,
  stacked = false,
} = defineProps<{
  label: string
  description?: string
  controlId?: string
  stacked?: boolean
}>()
</script>

<template>
  <Field :orientation="stacked ? 'vertical' : 'horizontal'" class="py-3" :class="stacked ? 'gap-2.5' : 'flex-wrap gap-x-4 gap-y-2'">
    <FieldContent class="min-w-40">
      <FieldLabel v-if="controlId" :for="controlId">{{ label }}</FieldLabel>
      <FieldTitle v-else>{{ label }}</FieldTitle>
      <FieldDescription v-if="description || $slots.description" class="text-xs">
        <slot name="description">{{ description }}</slot>
      </FieldDescription>
    </FieldContent>
    <slot />
  </Field>
</template>
