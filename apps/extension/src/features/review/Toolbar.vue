<script setup lang="ts">
import { CircleHelp, Columns2, Monitor, Moon, NotebookPen, PanelLeft, Pencil, RotateCw, Rows2, Settings, Sun, X } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useAppearance } from '../appearance/useAppearance'
import { useSettingsOpener } from '../settings/useSettingsOpener'
import { useUpdates } from '../updates/useUpdates'
import type { DiffMode, Preset, ThemeMode } from '../../lib/types'
import ProgressRing from './ProgressRing.vue'

defineProps<{
  title: string
  presets: Preset[]
  activePreset: string
  hiddenPresets?: string[]
  done: number
  total: number
  inView: number
  noteCount: number
  compact: boolean
  splitDisabled: boolean
}>()

const diffMode = defineModel<DiffMode>('diffMode', { required: true })

const { theme, setTheme } = useAppearance()
const { ready: updateReady, restart } = useUpdates()

const emit = defineEmits<{ selectPreset: [name: string]; hidePreset: [name: string]; openNotes: []; toggleSidebar: []; close: [] }>()
const openSettings = useSettingsOpener()
</script>

<template>
  <header class="flex flex-wrap items-center gap-x-2 gap-y-2 xl:flex-nowrap border-b bg-sidebar px-3 py-2 sm:gap-x-3 sm:px-4">
    <Button
      v-if="compact"
      variant="outline"
      size="icon-sm"
      class="order-1 shrink-0 xl:order-none"
      aria-label="Toggle sidebar"
      title="Files and filters"
      @click="emit('toggleSidebar')"
    >
      <PanelLeft />
    </Button>
    <div class="order-1 flex min-w-0 flex-1 flex-col xl:order-none xl:flex-initial">
      <h1 class="truncate text-sm leading-5 font-semibold" :title="title">{{ title }}</h1>
      <slot name="meta" />
    </div>
    <Button variant="ghost" size="icon-sm" class="order-1 shrink-0 xl:hidden" aria-label="Close" @click="emit('close')"><X /></Button>
    <div class="order-2 basis-full xl:hidden" />

    <div
      class="order-3 flex shrink-0 items-center gap-2 xl:order-none xl:border-l xl:pl-3"
      :title="`${done} of ${total} files viewed · ${inView} in the current view`"
    >
      <ProgressRing :done="done" :total="total" />
      <div class="leading-tight">
        <p class="text-xs font-semibold whitespace-nowrap">{{ total - done }}<span class="hidden sm:inline"> left</span></p>
        <p class="hidden text-[11px] whitespace-nowrap text-muted-foreground xl:block">{{ done }} of {{ total }} done</p>
      </div>
    </div>

    <div class="order-3 flex-1 xl:order-none" />

    <div v-if="presets.length" class="order-3 flex shrink-0 gap-1 xl:order-none">
      <Button
        v-for="p in presets"
        :key="p.name"
        size="sm"
        :variant="p.name === activePreset ? 'default' : 'outline'"
        :class="hiddenPresets?.includes(p.name) ? 'border-destructive/40 text-destructive line-through' : ''"
        :title="
          hiddenPresets?.includes(p.name)
            ? 'Its files are hidden. Click to show them again'
            : 'Click to list only its files. Right-click to hide them'
        "
        @click="emit('selectPreset', p.name)"
        @contextmenu.prevent="emit('hidePreset', p.name)"
      >
        {{ p.name }}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Edit saved filters"
        aria-label="Edit saved filters"
        class="text-muted-foreground"
        @click="openSettings('filters')"
        ><Pencil
      /></Button>
    </div>

    <ToggleGroup
      v-if="!splitDisabled"
      type="single"
      variant="outline"
      size="sm"
      class="order-3 shrink-0 xl:order-none"
      :model-value="diffMode"
      aria-label="Diff display"
      @update:model-value="(v) => v && (diffMode = v as DiffMode)"
    >
      <ToggleGroupItem value="unified" title="Unified diff for all files" aria-label="Unified"
        ><Rows2 /><span class="hidden xl:inline">Unified</span></ToggleGroupItem
      >
      <ToggleGroupItem value="split" title="Split diff for all files" aria-label="Split"
        ><Columns2 /><span class="hidden xl:inline">Split</span></ToggleGroupItem
      >
    </ToggleGroup>

    <div class="order-3 flex shrink-0 items-center gap-2 empty:hidden xl:order-none sm:gap-3"><slot name="actions" /></div>

    <Button variant="outline" size="sm" class="order-3 shrink-0 xl:order-none" title="Your private notes" @click="emit('openNotes')">
      <NotebookPen /><span class="hidden xl:inline">Notes</span>
      <Badge v-if="noteCount" class="h-4 min-w-4 px-1.5 text-[11px]">{{ noteCount }}</Badge>
    </Button>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          variant="outline"
          size="icon-sm"
          class="relative order-3 shrink-0 xl:order-none"
          :aria-label="updateReady ? 'Options, update ready' : 'Options'"
          :title="updateReady ? `Theme, settings and help · PR Sift ${updateReady} is ready` : 'Theme, settings and help'"
        >
          <Settings />
          <span v-if="updateReady" class="absolute -top-1 -right-1 size-2 rounded-full bg-emphasis" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-56">
        <template v-if="updateReady">
          <DropdownMenuItem @select="restart"><RotateCw /> Restart to update to {{ updateReady }}</DropdownMenuItem>
          <DropdownMenuSeparator />
        </template>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup :model-value="theme" @update:model-value="(v) => setTheme(v as ThemeMode)">
            <DropdownMenuRadioItem value="system"><Monitor /> System</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="light"><Sun /> Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark"><Moon /> Dark</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem @select="openSettings()"><Settings /> Settings</DropdownMenuItem>
        <DropdownMenuItem @select="openSettings('about')"><CircleHelp /> Help and feedback</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Button variant="ghost" size="icon-sm" class="hidden shrink-0 xl:inline-flex" aria-label="Close" @click="emit('close')"><X /></Button>
  </header>
</template>
