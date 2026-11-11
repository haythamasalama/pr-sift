<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue'
import { CheckCheck, MessageSquareText, ChevronsDownUp, ChevronsUpDown, Plus, RotateCcw, Undo2, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { NOTES_CHIP } from '@pr-sift/core'
import type { ExtChip } from '../../lib/types'
import FileStatusIcon from '../diff/FileStatusIcon.vue'

const { chips } = defineProps<{
  chips: ExtChip[]
  listedCount: number
  viewedInViewCount: number
  hiddenCount: number
  filtersActive: boolean
}>()
const reviewMode = defineModel<boolean>('reviewMode', { required: true })
const showHidden = defineModel<boolean>('showHidden', { required: true })

const emit = defineEmits<{
  toggleExtension: [ext: string, hide: boolean]
  resetFilters: []
  addExtension: [ext: string]
  removeExtension: [ext: string]
  markListed: []
  unmarkViewed: []
  clearAll: []
  expandCards: []
  collapseCards: []
}>()

const extensionChips = computed(() => chips.filter((c) => !c.ext.includes(':')))
const statusChips = computed(() => chips.filter((c) => c.ext.includes(':')))

const adding = shallowRef(false)
const draft = shallowRef('')
const input = useTemplateRef<{ $el: HTMLInputElement }>('input')
const confirmClear = shallowRef(false)

async function startAdding() {
  adding.value = true
  await nextTick()
  input.value?.$el.focus()
}

function submitExtension() {
  if (draft.value.trim()) emit('addExtension', draft.value)
  draft.value = ''
  adding.value = false
}

function clearAll() {
  if (!confirmClear.value) {
    confirmClear.value = true
    setTimeout(() => (confirmClear.value = false), 3000)
    return
  }
  confirmClear.value = false
  emit('clearAll')
}

const chipVariant = (chip: ExtChip) => (chip.state === 'include' ? 'default' : chip.state === 'exclude' ? 'outline' : 'secondary')
const chipTitle = (chip: ExtChip) =>
  chip.state === 'include'
    ? 'Showing only this type. Click to undo'
    : chip.state === 'exclude'
      ? 'Always hidden. Click to show again'
      : 'Click to show only this type. Shift-click or right-click to always hide it'
const isHideGesture = (e: MouseEvent) => e.shiftKey || e.altKey || e.metaKey || e.ctrlKey
const chipClass = (chip: ExtChip) => [
  'h-[22px] gap-1 rounded-full px-2.5 text-[11px] font-medium shadow-none',
  chip.ext.includes(':') ? '' : 'font-mono',
  chip.state === 'exclude' ? 'border-destructive/40 text-destructive line-through' : '',
]
</script>

<template>
  <div class="flex flex-wrap items-start gap-x-3 gap-y-2 border-b bg-sidebar px-3 py-2 sm:px-4">
    <div class="flex min-w-0 flex-1 basis-[22rem] flex-wrap items-center gap-1">
      <span class="mr-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Types</span>
      <Button
        v-if="filtersActive"
        variant="outline"
        size="xs"
        class="mr-1 h-[22px] rounded-full px-2.5 text-[11px]"
        title="Clear every filter and go back to the defaults"
        @click="emit('resetFilters')"
      >
        <RotateCcw /> Reset filters
      </Button>
      <span v-for="c in extensionChips" :key="c.ext" class="inline-flex items-center">
        <Button
          size="xs"
          :variant="chipVariant(c)"
          :title="chipTitle(c)"
          :class="chipClass(c)"
          @click="(e: MouseEvent) => emit('toggleExtension', c.ext, isHideGesture(e))"
          @contextmenu.prevent="emit('toggleExtension', c.ext, true)"
        >
          {{ c.label }} <span class="font-sans tabular-nums opacity-60">{{ c.count }}</span>
        </Button>
        <Button
          v-if="c.custom"
          variant="ghost"
          size="icon-xs"
          class="size-5"
          aria-label="Remove custom type"
          @click="emit('removeExtension', c.ext)"
        >
          <X />
        </Button>
      </span>

      <Input
        v-if="adding"
        ref="input"
        v-model="draft"
        placeholder=".blade.php"
        class="h-[22px] w-28 px-2 font-mono text-[11px] md:text-[11px]"
        @keydown.enter="submitExtension"
        @keydown.esc.stop="adding = false"
        @blur="submitExtension"
      />
      <Button
        v-else
        variant="ghost"
        size="xs"
        class="h-[22px] rounded-full border border-dashed px-2.5 text-[11px] text-muted-foreground"
        title="Add a file type, e.g. .blade.php"
        @click="startAdding"
      >
        <Plus /> type
      </Button>

      <template v-if="statusChips.length">
        <Separator orientation="vertical" class="mx-1.5 h-4" />
        <Button
          v-for="c in statusChips"
          :key="c.ext"
          size="xs"
          :variant="chipVariant(c)"
          :title="chipTitle(c)"
          :class="chipClass(c)"
          @click="(e: MouseEvent) => emit('toggleExtension', c.ext, isHideGesture(e))"
          @contextmenu.prevent="emit('toggleExtension', c.ext, true)"
        >
          <MessageSquareText v-if="c.ext === NOTES_CHIP" class="size-3 text-amber-600 dark:text-amber-400" />
          <FileStatusIcon v-else :status="c.ext.slice(7)" decorative class="size-3.5" />
          {{ c.label }} <span class="tabular-nums opacity-60">{{ c.count }}</span>
        </Button>
      </template>
    </div>

    <div class="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-xs">
      <div class="flex items-center">
        <Button variant="ghost" size="icon-xs" title="Expand all files" aria-label="Expand all files" @click="emit('expandCards')"
          ><ChevronsUpDown
        /></Button>
        <Button variant="ghost" size="icon-xs" title="Collapse all files" aria-label="Collapse all files" @click="emit('collapseCards')"
          ><ChevronsDownUp
        /></Button>
      </div>
      <Separator orientation="vertical" class="hidden h-4 sm:block" />
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5" title="Show files hidden by your rules (lock files, minified files…)">
          <Checkbox id="show-hidden" :model-value="showHidden" @update:model-value="(v) => (showHidden = v === true)" />
          <Label for="show-hidden" class="text-xs font-normal whitespace-nowrap text-muted-foreground">Hidden ({{ hiddenCount }})</Label>
        </div>
        <div class="flex items-center gap-1.5" title="Files disappear from the list and the tree as soon as you mark them viewed">
          <Switch id="hide-viewed" v-model="reviewMode" />
          <Label for="hide-viewed" class="text-xs font-normal whitespace-nowrap">Hide viewed</Label>
        </div>
      </div>
      <Separator orientation="vertical" class="hidden h-4 sm:block" />
      <div class="flex items-center gap-1">
        <Button
          variant="ghost"
          size="xs"
          class="h-7 px-2 text-xs"
          :title="`Mark the ${listedCount} files in this view as viewed`"
          :disabled="!listedCount"
          @click="emit('markListed')"
        >
          <CheckCheck /> Mark all
        </Button>
        <Button
          variant="ghost"
          size="xs"
          class="h-7 px-2 text-xs"
          :title="`Bring back the ${viewedInViewCount} viewed files in this view`"
          :disabled="!viewedInViewCount"
          @click="emit('unmarkViewed')"
        >
          <Undo2 /> Restore{{ viewedInViewCount ? ` ${viewedInViewCount}` : '' }}
        </Button>
        <Button
          :variant="confirmClear ? 'destructive' : 'ghost'"
          size="xs"
          class="h-7 px-2 text-xs"
          title="Clear every viewed mark in this pull request"
          @click="clearAll"
        >
          <RotateCcw /> {{ confirmClear ? 'Click again' : 'Clear viewed' }}
        </Button>
      </div>
    </div>
  </div>
</template>
