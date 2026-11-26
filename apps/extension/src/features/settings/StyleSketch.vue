<script setup lang="ts">
import type { ThemeStyle } from '../../lib/types'
import { themeAttrs } from '../appearance/useAppearance'

const { themeStyle, dark, small = false } = defineProps<{ themeStyle: ThemeStyle; dark: boolean; small?: boolean }>()
</script>

<template>
  <span
    class="ps-root flex size-full items-center justify-center bg-background"
    :class="[{ dark }, small ? 'gap-1 px-1' : 'gap-2 px-2']"
    v-bind="themeAttrs(themeStyle)"
  >
    <span
      class="flex flex-col border border-popover-ring bg-popover shadow-overlay"
      :class="small ? 'w-6 gap-px rounded-sm p-px' : 'w-14 gap-0.5 rounded-lg p-0.5'"
    >
      <span class="flex items-center rounded-sm bg-accent" :class="small ? 'h-1.5 px-0.5' : 'h-2.5 px-1'">
        <span class="h-[3px] rounded-full bg-accent-foreground/70" :class="small ? 'h-0.5 w-3' : 'w-7'" />
      </span>
      <span class="flex items-center" :class="small ? 'h-1.5 px-0.5' : 'h-2.5 px-1'">
        <span class="h-[3px] rounded-full bg-muted-foreground/60" :class="small ? 'h-0.5 w-2' : 'w-5'" />
      </span>
    </span>
    <span class="flex flex-col" :class="small ? 'gap-0.5' : 'gap-1'">
      <span class="rounded-md bg-primary" :class="small ? 'h-1.5 w-3.5 rounded-sm' : 'h-3 w-8'" />
      <span class="rounded-md border border-input bg-background" :class="small ? 'h-1.5 w-3.5 rounded-sm' : 'h-3 w-8'" />
    </span>
  </span>
</template>
