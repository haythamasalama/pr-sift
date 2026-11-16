<script setup lang="ts">
import { computed } from 'vue'
import { FileText, Folder } from '@lucide/vue'

const { indent, guides } = defineProps<{ indent: number; guides: boolean }>()

const level = computed(() => ({ paddingLeft: `${indent}px` }))
const line = computed(() => (guides ? '' : 'border-transparent'))
</script>

<template>
  <div class="rounded-md border bg-sidebar px-2 py-1.5 text-[11px] leading-5" aria-hidden="true">
    <p class="flex items-center gap-1"><Folder class="size-3 text-muted-foreground" />src</p>
    <div class="ml-3 border-l" :class="line" :style="level">
      <p class="flex items-center gap-1"><Folder class="size-3 text-muted-foreground" />Domain</p>
      <div class="ml-3 border-l" :class="line" :style="level">
        <p class="flex items-center gap-1"><Folder class="size-3 text-muted-foreground" />Billing</p>
        <div class="ml-3 border-l" :class="line" :style="level">
          <p class="flex items-center gap-1 truncate"><FileText class="size-3 shrink-0 text-muted-foreground" />GenerateInvoice.php</p>
        </div>
      </div>
    </div>
  </div>
</template>
