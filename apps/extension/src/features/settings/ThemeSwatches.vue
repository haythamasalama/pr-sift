<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import type { ThemeStyle } from '../../lib/types'
import { THEME_STYLES, themeAttrs } from '../appearance/useAppearance'

const { dark } = defineProps<{ dark: boolean }>()
const model = defineModel<ThemeStyle>({ required: true })
</script>

<template>
  <RadioGroupRoot
    :model-value="model"
    aria-label="Theme"
    orientation="horizontal"
    class="flex flex-wrap gap-3 [--ps-swatch-offset:var(--background)] [--ps-swatch-ring:var(--ring)]"
    @update:model-value="(v) => v && (model = v as ThemeStyle)"
  >
    <RadioGroupItem
      v-for="t in THEME_STYLES"
      :id="`settings-style-${t.value}`"
      :key="t.value"
      :value="t.value"
      :title="t.hint"
      class="group flex cursor-pointer flex-col items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground outline-none data-[state=checked]:text-foreground"
    >
      <span
        class="ps-root flex h-[38px] w-14 items-center justify-center gap-1 rounded-lg border bg-background ring-offset-2 ring-offset-(--ps-swatch-offset) group-hover:border-muted-foreground group-focus-visible:ring-2 group-focus-visible:ring-ring/50 group-data-[state=checked]:ring-2 group-data-[state=checked]:ring-(--ps-swatch-ring)"
        :class="{ dark }"
        v-bind="themeAttrs(t.value)"
        aria-hidden="true"
      >
        <span class="h-2.5 w-4 rounded-sm border bg-muted" />
        <span class="h-2.5 w-5 rounded-sm bg-primary" />
      </span>
      {{ t.label }}
    </RadioGroupItem>
  </RadioGroupRoot>
</template>
