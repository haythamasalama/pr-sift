<script setup lang="ts">
import { FieldLabel } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { BaseColor, ThemeStyle } from '../../lib/types'
import { BASE_COLORS, themeAttrs } from '../appearance/useAppearance'

const { themeStyle } = defineProps<{ themeStyle: ThemeStyle }>()
const model = defineModel<BaseColor>({ required: true })
</script>

<template>
  <RadioGroup
    :model-value="model"
    aria-label="Base color"
    class="flex flex-wrap gap-2"
    @update:model-value="(v) => v && (model = v as BaseColor)"
  >
    <FieldLabel
      v-for="color in BASE_COLORS"
      :key="color.value"
      :for="`base-${color.value}`"
      class="flex w-auto cursor-pointer items-center gap-2 rounded-md border py-1 pr-2.5 pl-1.5 text-xs font-normal has-data-[state=checked]:border-ring has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-ring"
    >
      <!-- The swatch is drawn by the palette's own tokens, so it always matches what the style paints. -->
      <span class="ps-root contents" v-bind="themeAttrs(themeStyle, color.value, '')" aria-hidden="true">
        <span class="size-3.5 shrink-0 rounded-full bg-muted-foreground" />
      </span>
      {{ color.label }}
      <RadioGroupItem :id="`base-${color.value}`" :value="color.value" class="sr-only" />
    </FieldLabel>
  </RadioGroup>
</template>
