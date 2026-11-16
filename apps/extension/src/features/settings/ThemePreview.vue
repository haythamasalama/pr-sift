<script setup lang="ts">
import type { ThemeMode } from '../../lib/types'

const { mode } = defineProps<{ mode: ThemeMode }>()

const LINES = [
  { sign: ' ', tone: '', width: 'w-3/5' },
  { sign: '−', tone: 'bg-del-bg text-del-fg', width: 'w-1/2' },
  { sign: '+', tone: 'bg-add-bg text-add-fg', width: 'w-4/5' },
  { sign: '+', tone: 'bg-add-bg text-add-fg', width: 'w-2/5' },
]
</script>

<template>
  <span class="relative block h-12 overflow-hidden rounded-md border" aria-hidden="true">
    <span
      v-for="dark in mode === 'system' ? [false, true] : [mode === 'dark']"
      :key="String(dark)"
      class="absolute inset-0 isolate"
      :class="{ '[clip-path:polygon(100%_0,100%_100%,0_100%)]': mode === 'system' && dark }"
    >
      <span
        class="ps-root flex size-full flex-col justify-center bg-background py-1 font-mono text-[9px] leading-[10px] text-muted-foreground"
        :class="{ dark }"
      >
        <span v-for="(line, i) in LINES" :key="i" class="flex items-center gap-1 px-1.5" :class="line.tone">
          <span class="w-1.5 shrink-0 text-center">{{ line.sign }}</span>
          <span class="h-[3px] rounded-full bg-current opacity-60" :class="line.width" />
        </span>
      </span>
    </span>
  </span>
</template>
