<script setup lang="ts">
import { computed } from 'vue'
import { ChevronDown, FileCode, Folder } from '@lucide/vue'

const { indent, guides } = defineProps<{ indent: number; guides: boolean }>()

const level = computed(() => ({ paddingLeft: `${indent}px` }))
const line = computed(() => (guides ? '' : 'border-transparent'))
</script>

<template>
  <!-- Drawn like the review's file tree: a chevron and a folder per level, the file picked at the bottom. -->
  <div class="w-60 rounded-lg border bg-muted/40 p-1.5 text-xs" aria-hidden="true">
    <p class="flex h-6 items-center gap-1 px-1">
      <ChevronDown class="size-3 text-muted-foreground" /><Folder class="size-3.5 text-muted-foreground" />src
    </p>
    <div class="ml-2.5 border-l" :class="line" :style="level">
      <p class="flex h-6 items-center gap-1 px-1">
        <ChevronDown class="size-3 text-muted-foreground" /><Folder class="size-3.5 text-muted-foreground" />Domain
      </p>
      <div class="ml-2.5 border-l" :class="line" :style="level">
        <p class="flex h-6 items-center gap-1 px-1">
          <ChevronDown class="size-3 text-muted-foreground" /><Folder class="size-3.5 text-muted-foreground" />Billing
        </p>
        <div class="ml-2.5 border-l" :class="line" :style="level">
          <p class="flex h-6 items-center gap-1.5 truncate rounded-md bg-accent px-1.5 font-medium text-accent-foreground">
            <FileCode class="size-3.5 shrink-0 text-muted-foreground" />GenerateInvoice.php
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
