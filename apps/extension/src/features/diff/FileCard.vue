<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { Check, ChevronDown, Columns2, Copy, ExternalLink, FileDiff, FileText, FolderTree, ListPlus, Rows2 } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { useDiffMode } from './diffMode'
import { cardsExpandKey, useExpandCommand } from '../tree/expandContext'
import type { PrFile } from '../../lib/types'
import DiffTable from './DiffTable.vue'
import FileStatusIcon from './FileStatusIcon.vue'

const { file, viewed, stale = false } = defineProps<{ file: PrFile; viewed: boolean; stale?: boolean }>()
const emit = defineEmits<{ viewed: [value: boolean] }>()

const globalMode = useDiffMode()
const override = shallowRef<'unified' | 'split' | null>(null)
const mode = computed(() => override.value ?? globalMode.value)
watch(globalMode, () => (override.value = null))

const el = useTemplateRef<HTMLElement>('el')
const body = useTemplateRef<HTMLElement>('body')
const seen = shallowRef(false)
const measuredHeight = shallowRef(0)
const collapsed = shallowRef(viewed)
const expandCommand = useExpandCommand(cardsExpandKey)
watch(
  () => viewed,
  (value) => (collapsed.value = value),
)
watch(
  () => expandCommand?.value.n,
  () => {
    if (expandCommand) collapsed.value = !expandCommand.value.open
  },
)
const flashing = shallowRef(false)
const copied = shallowRef(false)
const fileName = computed(() => file.filename.split('/').pop() ?? file.filename)
const addedLines = computed(() =>
  (file.patch ?? '')
    .split('\n')
    .filter((line) => line.startsWith('+'))
    .map((line) => line.slice(1))
    .join('\n'),
)

async function copy(text: string) {
  await navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
const estimatedHeight = computed(() => (file.patch ? Math.min(file.patch.split('\n').length * 18 + 8, 40000) : 64))
let observer: IntersectionObserver | undefined

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          seen.value = true
        } else if (seen.value) {
          measuredHeight.value = body.value?.offsetHeight ?? measuredHeight.value
          seen.value = false
        }
      }
    },
    { rootMargin: '1500px 0px' },
  )
  if (el.value) observer.observe(el.value)
})
onBeforeUnmount(() => observer?.disconnect())

function reveal() {
  collapsed.value = false
  seen.value = true
}

function flash() {
  flashing.value = true
  setTimeout(() => (flashing.value = false), 1400)
}

defineExpose({ reveal, flash, el })
</script>

<template>
  <section
    ref="el"
    :data-file="file.filename"
    class="mb-3 rounded-lg border bg-background transition-shadow"
    :class="flashing ? 'border-primary ring-2 ring-primary' : 'border-border'"
  >
    <div class="sticky top-0 z-10 flex items-center gap-2.5 rounded-t-lg border-b bg-muted px-3 py-1.5">
      <Button variant="ghost" size="icon-xs" :aria-label="collapsed ? 'Expand file' : 'Collapse file'" @click="collapsed = !collapsed">
        <ChevronDown class="transition-transform" :class="collapsed ? '-rotate-90' : ''" />
      </Button>
      <div class="flex items-center gap-1.5" title="Mark as viewed">
        <Checkbox :id="`viewed-${file.filename}`" :model-value="viewed" @update:model-value="(value) => emit('viewed', value === true)" />
        <Label :for="`viewed-${file.filename}`" class="text-xs font-normal text-muted-foreground">Viewed</Label>
      </div>
      <FileStatusIcon :status="file.status" class="size-4" />
      <button type="button" class="min-w-0 flex-1 truncate text-left font-mono text-xs" @click="collapsed = !collapsed">
        {{ file.filename }}
      </button>
      <Badge
        v-if="stale"
        variant="outline"
        class="border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-400"
        title="This file changed after you marked it viewed"
      >
        Updated since viewed
      </Badge>
      <span class="text-xs font-medium text-add-fg">+{{ file.additions }}</span>
      <span class="text-xs font-medium text-del-fg">−{{ file.deletions }}</span>
      <Button
        v-if="file.patch"
        variant="ghost"
        size="icon-xs"
        :title="mode === 'split' ? 'Show this file as unified' : 'Show this file as split'"
        :aria-label="mode === 'split' ? 'Show this file as unified' : 'Show this file as split'"
        @click="override = mode === 'split' ? 'unified' : 'split'"
      >
        <Rows2 v-if="mode === 'split'" />
        <Columns2 v-else />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon-xs" title="Copy…" aria-label="Copy">
            <Check v-if="copied" class="text-success" />
            <Copy v-else />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-48 text-xs">
          <DropdownMenuItem @select="copy(fileName)"><FileText /> Copy file name</DropdownMenuItem>
          <DropdownMenuItem @select="copy(file.filename)"><FolderTree /> Copy full path</DropdownMenuItem>
          <DropdownMenuItem :disabled="!file.patch" @select="copy(file.patch ?? '')"><FileDiff /> Copy diff</DropdownMenuItem>
          <DropdownMenuItem :disabled="!addedLines" @select="copy(addedLines)"><ListPlus /> Copy added lines</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="ghost" size="icon-xs" as-child aria-label="Open on GitHub">
        <a :href="file.blob_url" target="_blank" rel="noreferrer"><ExternalLink /></a>
      </Button>
    </div>

    <template v-if="!collapsed">
      <div v-if="seen" ref="body">
        <DiffTable v-if="file.patch" :filename="file.filename" :patch="file.patch" :mode="mode" />
        <p v-else class="p-4 text-xs text-muted-foreground">No inline diff available (binary, renamed without changes, or too large).</p>
      </div>
      <div v-else :style="{ height: (measuredHeight || estimatedHeight) + 'px' }" />
    </template>
  </section>
</template>
