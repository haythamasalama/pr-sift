<script setup lang="ts">
import {
  Bug,
  Columns2,
  Lightbulb,
  Monitor,
  Moon,
  NotebookPen,
  PanelLeft,
  RotateCw,
  Rows2,
  Search,
  Settings,
  Star,
  Sun,
  X,
} from '@lucide/vue'
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
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useAppearance } from '../appearance/useAppearance'
import { openReport } from '../../lib/report'
import { openOptions } from '../../lib/extension'
import { openReviews } from '../../lib/updates'
import { useUpdates } from '../updates/useUpdates'
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
const { ready: updateReady, restart } = useUpdates()

const emit = defineEmits<{ selectPreset: [name: string]; openNotes: []; toggleSidebar: []; close: [] }>()
</script>

<template>
  <header class="flex items-center gap-2 border-b bg-sidebar px-3 py-2 sm:gap-3 sm:px-4">
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
    <div class="flex min-w-0 flex-col">
      <h1 class="truncate text-sm leading-5 font-semibold" :title="title">{{ title }}</h1>
      <slot name="meta" />
    </div>
    <div class="flex shrink-0 items-center gap-2 border-l pl-3" :title="`${done} of ${total} files viewed · ${inView} in the current view`">
      <ProgressRing :done="done" :total="total" />
      <div class="leading-tight">
        <p class="text-xs font-semibold whitespace-nowrap">{{ total - done }}<span class="hidden sm:inline"> left</span></p>
        <p class="hidden text-[11px] whitespace-nowrap text-muted-foreground xl:block">{{ done }} of {{ total }} done</p>
      </div>
    </div>

    <div class="flex-1" />

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

    <div v-if="compact" class="relative flex shrink-0 items-center">
      <Search class="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
      <Input
        v-model="query"
        type="search"
        placeholder="Filter files…"
        class="h-8 w-24 bg-background pl-8 text-xs sm:w-44 md:text-xs xl:w-56"
      />
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

    <slot name="actions" />

    <Button variant="outline" size="sm" class="shrink-0" title="Your private notes" @click="emit('openNotes')">
      <NotebookPen /><span class="hidden xl:inline">Notes</span>
      <Badge v-if="noteCount" class="h-4 min-w-4 px-1.5 text-[11px]">{{ noteCount }}</Badge>
    </Button>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          variant="outline"
          size="icon-sm"
          class="relative shrink-0"
          :aria-label="updateReady ? 'Options, update ready' : 'Options'"
          :title="updateReady ? `Theme, settings and help · PR Sift ${updateReady} is ready` : 'Theme, settings and help'"
        >
          <Settings />
          <span v-if="updateReady" class="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emphasis ring-2 ring-sidebar" />
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
        <DropdownMenuItem @select="openOptions"><Settings /> Settings</DropdownMenuItem>
        <DropdownMenuItem @select="openReport('bug')"><Bug /> Report a problem</DropdownMenuItem>
        <DropdownMenuItem @select="openReport('idea')"><Lightbulb /> Suggest an idea</DropdownMenuItem>
        <DropdownMenuItem @select="openReviews"><Star /> Rate PR Sift</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Button variant="ghost" size="icon-sm" class="shrink-0" aria-label="Close" @click="emit('close')"><X /></Button>
  </header>
</template>
