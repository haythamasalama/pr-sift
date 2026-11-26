<script setup lang="ts">
import type { ThemeStyle } from '../../lib/types'
import { themeAttrs } from '../appearance/useAppearance'

const { themeStyle, dark } = defineProps<{ themeStyle: ThemeStyle; dark: boolean }>()
</script>

<template>
  <span class="block h-12 overflow-hidden rounded-md border" aria-hidden="true">
    <span
      class="ps-root flex size-full items-center justify-center gap-2 bg-background px-2"
      :class="{ dark }"
      v-bind="themeAttrs(themeStyle)"
    >
      <span class="flex w-14 flex-col gap-0.5 rounded-lg border border-popover-ring bg-popover p-0.5 shadow-overlay">
        <span class="flex h-2.5 items-center rounded-sm bg-accent px-1">
          <span class="h-[3px] w-7 rounded-full bg-accent-foreground/70" />
        </span>
        <span class="flex h-2.5 items-center px-1"><span class="h-[3px] w-5 rounded-full bg-muted-foreground/60" /></span>
      </span>
      <span class="flex flex-col gap-1">
        <span class="h-3 w-8 rounded-md bg-primary" />
        <span class="h-3 w-8 rounded-md border border-input bg-background" />
      </span>
    </span>
  </span>
</template>
