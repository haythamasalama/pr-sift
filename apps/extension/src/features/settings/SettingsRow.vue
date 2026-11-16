<script setup lang="ts">
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '@/components/ui/field'
import NewDot from '../../components/NewDot.vue'

const {
  label,
  description,
  controlId,
  stacked = false,
  isNew = false,
} = defineProps<{
  label: string
  description?: string
  controlId?: string
  stacked?: boolean
  isNew?: boolean
}>()
</script>

<template>
  <Field :orientation="stacked ? 'vertical' : 'horizontal'" class="py-3" :class="stacked ? 'gap-2.5' : 'flex-wrap gap-x-4 gap-y-2'">
    <FieldContent class="min-w-40">
      <FieldLabel v-if="controlId" :for="controlId" class="items-center gap-2"> {{ label }}<NewDot v-if="isNew" /> </FieldLabel>
      <FieldTitle v-else class="items-center gap-2">{{ label }}<NewDot v-if="isNew" /></FieldTitle>
      <FieldDescription v-if="description || $slots.description" class="text-xs">
        <slot name="description">{{ description }}</slot>
      </FieldDescription>
    </FieldContent>
    <slot />
  </Field>
</template>
