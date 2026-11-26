<script setup lang="ts" generic="T extends string">
import { FieldLabel } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const { options, label, name, minWidth } = defineProps<{
  options: { value: T; label: string; hint?: string }[]
  label: string
  name: string
  minWidth?: string
}>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <RadioGroup
    :model-value="model"
    :aria-label="label"
    class="grid gap-2"
    :style="{
      gridTemplateColumns: minWidth ? `repeat(auto-fill, minmax(${minWidth}, 1fr))` : `repeat(${options.length}, minmax(0, 1fr))`,
    }"
    @update:model-value="(v) => v && (model = v as T)"
  >
    <FieldLabel
      v-for="option in options"
      :key="option.value"
      :for="`${name}-${option.value}`"
      class="flex w-full cursor-pointer flex-col items-stretch gap-1.5 rounded-lg border p-1.5 text-xs font-normal has-data-[state=checked]:border-ring has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-ring"
      :title="option.hint"
    >
      <slot name="preview" :value="option.value" />
      <span class="flex items-center gap-1.5 px-0.5">
        <RadioGroupItem :id="`${name}-${option.value}`" :value="option.value" class="size-3.5" />
        <span class="leading-tight">{{ option.label }}</span>
      </span>
    </FieldLabel>
  </RadioGroup>
</template>
