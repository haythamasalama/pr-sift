<script setup lang="ts">
import { computed } from 'vue'
import { parsePatch } from '@pr-sift/core'

const { text } = defineProps<{ text: string }>()

// Everything after the first hunk header is the patch; a binary file has none.
const rows = computed(() => {
  const at = text.indexOf('\n@@')
  if (at === -1) return []
  return parsePatch(text.slice(at + 1)).slice(0, 4000)
})
const binary = computed(() => /^Binary files/m.test(text))
</script>

<template>
  <p v-if="binary" class="p-3 text-xs text-muted-foreground">Binary file, not shown.</p>
  <p v-else-if="!rows.length" class="p-3 text-xs text-muted-foreground">No text changes.</p>
  <div v-else class="overflow-x-auto font-mono text-[12px] leading-5">
    <table class="w-full border-collapse">
      <tbody>
        <tr
          v-for="(row, i) in rows"
          :key="i"
          :class="{
            'bg-success/10': row.kind === 'add',
            'bg-destructive/10': row.kind === 'del',
            'bg-secondary text-muted-foreground': row.kind === 'hunk' || row.kind === 'note',
          }"
        >
          <td class="w-10 pr-2 text-right align-top text-muted-foreground/70 select-none">{{ row.oldNo }}</td>
          <td class="w-10 pr-2 text-right align-top text-muted-foreground/70 select-none">{{ row.newNo }}</td>
          <td class="w-4 align-top select-none" :class="row.kind === 'add' ? 'text-success' : row.kind === 'del' ? 'text-destructive' : ''">
            {{ row.kind === 'add' ? '+' : row.kind === 'del' ? '−' : '' }}
          </td>
          <td class="pr-3 whitespace-pre">{{ row.text }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
