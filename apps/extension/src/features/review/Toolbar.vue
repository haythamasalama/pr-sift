<script setup lang="ts">
import { Columns2, Monitor, Moon, NotebookPen, PanelLeft, Palette as PaletteIcon, Rows2, Search, Sun, X } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useAppearance } from '../appearance/useAppearance'
import type { DiffMode, Preset, ThemeMode } from '../../lib/types'
import ProgressRing from './ProgressRing.vue'

defineProps<{
  title: string
  presets: Preset[]
  activePreset: string
  done: number
  total: number
  inView: number
  noteCount: number
  compact: boolean
  splitDisabled: boolean
}>()

const query = defineModel<string>('query', { required: true })
const diffMode = defineModel<DiffMode>('diffMode', { required: true })

const { theme, setTheme } = useAppearance()

const emit = defineEmits<{ selectPreset: [name: string]; openNotes: []; toggleSidebar: []; close: [] }>()
</script>

<template>
  <header class="flex items-center gap-2 border-b bg-muted px-3 py-2 sm:gap-3 sm:px-4">
    <Button
      v-if="compact"
      variant="outline"
      size="icon-sm"
      class="shrink-0"
      aria-label="Toggle sidebar"
      title="Files and filters"
      @click="emit('toggleSidebar')"
    >
      <PanelLeft />
    </Button>
    <h1 class="min-w-24 flex-1 truncate text-sm font-semibold" :title="title">{{ title }}</h1>

    <div v-if="presets.length" class="flex shrink-0 gap-1">
      <Button
        v-for="p in presets"
        :key="p.name"
        size="sm"
        :variant="p.name === activePreset ? 'default' : 'outline'"
        @click="emit('selectPreset', p.name)"
      >
        {{ p.name }}
      </Button>
    </div>

    <div class="relative flex shrink-0 items-center">
      <Search class="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
      <Input
        v-model="query"
        type="search"
        placeholder="Filter files…"
        class="h-8 w-24 bg-background pl-8 text-xs sm:w-44 md:text-xs xl:w-56"
      />
    </div>

    <div class="flex shrink-0 items-center gap-2" :title="`${done} of ${total} files viewed · ${inView} in the current view`">
      <ProgressRing :done="done" :total="total" />
      <div class="leading-tight">
        <p class="text-xs font-semibold whitespace-nowrap">{{ total - done }}<span class="hidden sm:inline"> left</span></p>
        <p class="hidden text-[11px] whitespace-nowrap text-muted-foreground xl:block">{{ done }} of {{ total }} done</p>
      </div>
    </div>

    <ToggleGroup
      v-if="!splitDisabled"
      type="single"
      variant="outline"
      size="sm"
      class="shrink-0"
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

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="outline" size="icon-sm" class="shrink-0" aria-label="Theme" title="Theme">
          <PaletteIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup :model-value="theme" @update:model-value="(v) => setTheme(v as ThemeMode)">
            <DropdownMenuRadioItem value="system"><Monitor /> System</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="light"><Sun /> Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark"><Moon /> Dark</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>

    <Button variant="outline" size="sm" class="shrink-0" title="Your private notes" @click="emit('openNotes')">
      <NotebookPen /><span class="hidden xl:inline">Notes</span>
      <Badge v-if="noteCount" class="h-4 min-w-4 px-1.5 text-[11px]">{{ noteCount }}</Badge>
    </Button>
    <Button variant="ghost" size="icon-sm" class="shrink-0" aria-label="Close" @click="emit('close')"><X /></Button>
  </header>
</template>
