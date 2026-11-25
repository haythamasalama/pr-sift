<script setup lang="ts">
import DiffSplitIcon from '@/components/DiffSplitIcon.vue'
import DiffUnifiedIcon from '@/components/DiffUnifiedIcon.vue'
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue'
import {
  CheckCheck,
  ChevronDown,
  Eye,
  FileText,
  Folder,
  MessageSquareText,
  EyeOff,
  Pencil,
  Bookmark,
  Plus,
  RotateCcw,
  Undo2,
  X,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { FOLDER_CHIP, NOTES_CHIP } from '@pr-sift/core'
import type { DiffMode, ExtChip, PrFile, Preset } from '../../lib/types'
import FileStatusIcon from '../diff/FileStatusIcon.vue'
import { useSettingsOpener } from '../settings/useSettingsOpener'

const {
  chips,
  viewPatterns = [],
  presets = [],
  activePreset = '',
  hiddenPresets = [],
} = defineProps<{
  chips: ExtChip[]
  presets?: Preset[]
  activePreset?: string
  hiddenPresets?: string[]
  splitDisabled?: boolean
  listedCount: number
  viewedInView: PrFile[]
  hiddenCount: number
  filtersActive: boolean
  viewPatterns?: string[]
}>()
const reviewMode = defineModel<boolean>('reviewMode', { required: true })
const showHidden = defineModel<boolean>('showHidden', { required: true })
const diffMode = defineModel<DiffMode>('diffMode', { required: true })

const DIFF_MODES = [
  { value: 'unified', label: 'Unified', title: 'Unified diff', icon: DiffUnifiedIcon },
  { value: 'split', label: 'Split', title: 'Split diff', icon: DiffSplitIcon },
] as const

const emit = defineEmits<{
  toggleExtension: [ext: string, hide: boolean]
  resetFilters: []
  addExtension: [ext: string]
  removeExtension: [ext: string]
  markListed: []
  unmarkViewed: []
  unmarkFile: [file: PrFile]
  clearAll: []
  saveView: [name: string]
  selectPreset: [name: string]
  hidePreset: [name: string]
}>()

const openSettings = useSettingsOpener()
const presetTitle = (name: string) =>
  hiddenPresets.includes(name) ? 'Its files are hidden. Click to show them again' : 'Click to list only its files. Right-click to hide them'
const saveOpen = shallowRef(false)
const viewName = shallowRef('')

function saveView() {
  const name = viewName.value.trim()
  if (!name) return
  emit('saveView', name)
  viewName.value = ''
  saveOpen.value = false
}

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

const baseName = (path: string) => path.split('/').pop() ?? path
const folderOf = (path: string) => path.split('/').slice(0, -1).join('/')

function clearAll(e: Event) {
  if (!confirmClear.value) {
    e.preventDefault()
    confirmClear.value = true
    setTimeout(() => (confirmClear.value = false), 3000)
    return
  }
  confirmClear.value = false
  emit('clearAll')
}

const chipVariant = (chip: ExtChip) => (chip.state === 'include' ? 'default' : 'outline')
const chipTitle = (chip: ExtChip) => {
  const kind = chip.ext.startsWith(FOLDER_CHIP) ? 'folder' : 'type'
  return chip.state === 'include'
    ? `Showing only this ${kind}. Click to undo`
    : chip.state === 'exclude'
      ? 'Always hidden. Click to show again'
      : `Click to show only this ${kind}. Shift-click or right-click to always hide it`
}
const isHideGesture = (e: MouseEvent) => e.shiftKey || e.altKey || e.metaKey || e.ctrlKey
const chipClass = (chip: ExtChip) => [
  'h-[22px] gap-1 rounded-sm px-2 text-xs font-normal shadow-none',
  chip.ext.includes(':') ? '' : 'font-mono',
  chip.state === 'exclude' ? 'border-destructive/40 text-destructive line-through' : '',
]
</script>

<template>
  <div class="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-2 border-b bg-sidebar px-3 py-[9px] sm:px-4">
    <div class="flex min-w-0 flex-1 basis-[22rem] flex-wrap items-center gap-1.5">
      <span class="mr-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Types</span>
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
        class="h-[22px] gap-1 rounded-sm border border-dashed border-border px-2 text-[11px] font-normal text-muted-foreground [&_svg]:size-[11px]"
        title="Add a file type, e.g. .blade.php"
        @click="startAdding"
      >
        <Plus /> type
      </Button>

      <template v-if="presets.length">
        <Separator orientation="vertical" class="mx-1.5 h-4 data-[orientation=vertical]:self-center" />
        <span class="mr-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Saved</span>
        <div role="group" aria-label="Saved filters" class="inline-flex gap-0.5 rounded-md bg-muted p-0.5">
          <Button
            size="xs"
            variant="ghost"
            :aria-pressed="!activePreset"
            class="h-[22px] rounded-sm px-2 text-xs text-muted-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs dark:aria-pressed:bg-accent"
            title="Show every file"
            @click="activePreset && emit('selectPreset', activePreset)"
          >
            All
          </Button>
          <Button
            v-for="p in presets"
            :key="p.name"
            size="xs"
            variant="ghost"
            :aria-pressed="p.name === activePreset"
            class="h-[22px] rounded-sm px-2 text-xs text-muted-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs dark:aria-pressed:bg-accent"
            :class="hiddenPresets.includes(p.name) ? 'text-destructive line-through' : ''"
            :title="presetTitle(p.name)"
            @click="emit('selectPreset', p.name)"
            @contextmenu.prevent="emit('hidePreset', p.name)"
          >
            {{ p.name }}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          class="size-[22px] text-muted-foreground [&_svg]:size-[13px]"
          title="Edit saved filters"
          aria-label="Edit saved filters"
          @click="openSettings('filters')"
          ><Pencil
        /></Button>
      </template>

      <template v-if="statusChips.length">
        <Separator orientation="vertical" class="mx-1.5 h-4 data-[orientation=vertical]:self-center" />
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
          <MessageSquareText v-if="c.ext === NOTES_CHIP" class="size-3 text-attention" />
          <Folder v-else-if="c.ext.startsWith(FOLDER_CHIP)" class="size-3.5 text-muted-foreground" />
          <FileStatusIcon v-else :status="c.ext.slice(7)" decorative class="size-3.5" />
          {{ c.label }} <span class="tabular-nums opacity-60">{{ c.count }}</span>
        </Button>
      </template>

      <!-- Last in the row, so showing it never moves the chip that was just clicked. -->
      <template v-if="filtersActive">
        <Separator orientation="vertical" class="mx-1.5 h-4 data-[orientation=vertical]:self-center" />
        <Button
          variant="outline"
          size="xs"
          class="h-[22px] rounded-md px-2.5 text-[11px]"
          title="Clear every filter and go back to the defaults"
          @click="emit('resetFilters')"
        >
          <RotateCcw /> Reset filters
        </Button>
        <Popover v-if="viewPatterns.length" v-model:open="saveOpen">
          <PopoverTrigger as-child>
            <Button
              variant="outline"
              size="xs"
              class="ml-1.5 h-[22px] rounded-md px-2.5 text-[11px]"
              title="Save these types and folders as a filter beside the file types"
            >
              <Bookmark /> Save view
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" class="w-72 gap-2.5 p-3">
            <form class="flex flex-col gap-2.5" @submit.prevent="saveView">
              <p class="text-sm font-medium">Save as a filter</p>
              <Input v-model="viewName" aria-label="Filter name" placeholder="Name, such as Backend" class="h-8 text-xs md:text-xs" />
              <p class="truncate font-mono text-[11px] text-muted-foreground" :title="viewPatterns.join('  ')">
                {{ viewPatterns.join('  ') }}
              </p>
              <div class="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" @click="saveOpen = false">Cancel</Button>
                <Button type="submit" size="sm" :disabled="!viewName.trim()">Save</Button>
              </div>
            </form>
          </PopoverContent>
        </Popover>
      </template>
    </div>

    <div class="ml-auto flex flex-wrap items-center justify-end gap-x-2.5 gap-y-2 text-xs">
      <ToggleGroup
        v-if="!splitDisabled"
        type="single"
        :spacing="0.5"
        class="gap-0.5 rounded-md bg-muted p-0.5"
        :model-value="diffMode"
        aria-label="Diff display"
        @update:model-value="(v) => v && (diffMode = v as DiffMode)"
      >
        <ToggleGroupItem
          v-for="m in DIFF_MODES"
          :key="m.value"
          :value="m.value"
          class="h-[22px] min-w-0 rounded-sm px-[7px] data-[state=on]:bg-background data-[state=on]:shadow-xs dark:data-[state=on]:bg-accent [&_svg]:size-[13px]"
          :title="m.title"
          :aria-label="m.label"
          ><component :is="m.icon"
        /></ToggleGroupItem>
      </ToggleGroup>
      <div class="flex items-center gap-2.5">
        <Button
          v-if="hiddenCount || showHidden"
          variant="ghost"
          size="xs"
          class="h-6 gap-[5px] rounded-sm px-2 text-xs font-normal text-muted-foreground [&_svg]:size-[13px]"
          :aria-pressed="showHidden"
          :title="
            showHidden
              ? 'Hide the files your rules hide again'
              : 'Files hidden by your rules (lock files, minified files…). Click to show them'
          "
          @click="showHidden = !showHidden"
        >
          <Eye v-if="showHidden" /><EyeOff v-else />
          {{ showHidden ? `Showing ${hiddenCount} hidden` : `${hiddenCount} hidden` }}
        </Button>
        <Toggle
          v-model="reviewMode"
          variant="outline"
          size="sm"
          class="h-6 min-w-0 gap-1.5 rounded-sm bg-background px-2 text-xs font-normal data-[state=off]:text-foreground dark:bg-input/30 [&_svg]:size-[13px]"
          title="Files disappear from the list and the tree as soon as you mark them viewed"
        >
          <CheckCheck /> Hide viewed
        </Toggle>
      </div>
      <Separator orientation="vertical" class="hidden h-4 sm:block data-[orientation=vertical]:self-center" />
      <div class="flex items-center gap-1">
        <DropdownMenu @update:open="(open) => !open && (confirmClear = false)">
          <DropdownMenuTrigger as-child>
            <Button
              variant="ghost"
              size="xs"
              class="h-[26px] gap-[5px] rounded-sm px-2 text-xs font-normal"
              title="Viewed files: mark all, restore one, restore all, or clear"
            >
              <Eye /> Viewed <span class="tabular-nums text-muted-foreground">{{ viewedInView.length }}</span><ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-80">
            <DropdownMenuGroup>
              <DropdownMenuItem :disabled="!listedCount" @select="emit('markListed')">
                <CheckCheck /> Mark all in view as viewed
                <DropdownMenuShortcut class="tracking-normal">{{ listedCount }}</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Restore a file</DropdownMenuLabel>
              <div v-if="viewedInView.length" class="max-h-64 overflow-y-auto">
                <DropdownMenuItem v-for="f in viewedInView" :key="f.filename" :title="f.filename" @select="emit('unmarkFile', f)">
                  <FileText />
                  <span class="max-w-[65%] shrink-0 truncate">{{ baseName(f.filename) }}</span>
                  <DropdownMenuShortcut class="min-w-0 truncate tracking-normal" dir="rtl">{{ folderOf(f.filename) }}</DropdownMenuShortcut>
                </DropdownMenuItem>
              </div>
              <DropdownMenuItem v-else disabled>No viewed files</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                :disabled="!viewedInView.length"
                title="Unmark every viewed file in the current view"
                @select="emit('unmarkViewed')"
              >
                <Undo2 /> Restore all in view
                <DropdownMenuShortcut class="tracking-normal">{{ viewedInView.length }}</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" title="Remove every viewed mark in this pull request" @select="clearAll">
                <RotateCcw /> {{ confirmClear ? 'Click again to confirm' : 'Clear all in PR' }}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>
</template>
