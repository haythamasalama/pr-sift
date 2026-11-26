<script setup lang="ts">
import type { ThemeStyle } from '../../lib/types'

const { themeStyle, dark } = defineProps<{ themeStyle: ThemeStyle; dark: boolean }>()
</script>

<template>
  <span class="block h-12 overflow-hidden rounded-md border" aria-hidden="true">
    <span class="ps-root flex size-full items-center justify-center gap-2 bg-background px-2" :class="{ dark }" :data-style="themeStyle">
      <span class="flex w-16 flex-col gap-0.5 rounded-lg bg-popover p-0.5 shadow-sm ring-1 ring-popover-ring">
        <span class="flex h-2.5 items-center rounded-md bg-accent px-1">
          <span class="h-[3px] w-8 rounded-full bg-accent-foreground/70" />
        </span>
        <span class="flex h-2.5 items-center px-1"><span class="h-[3px] w-6 rounded-full bg-muted-foreground/60" /></span>
      </span>
      <span class="flex flex-col gap-1">
        <span class="h-3 w-9 rounded-md bg-success" />
        <span class="h-3 w-9 rounded-md border border-input bg-background" />
      </span>
    </span>
  </span>
</template>
