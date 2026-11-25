<script setup lang="ts">
import { ArrowLeft, CircleHelp, Monitor, Moon, NotepadText, PanelLeft, RotateCw, Settings, Sun, X } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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
import { useAppearance } from '../appearance/useAppearance'
import { useSettingsOpener } from '../settings/useSettingsOpener'
import { useUpdates } from '../updates/useUpdates'
import type { ThemeMode } from '../../lib/types'
import ProgressRing from './ProgressRing.vue'

defineProps<{
  title: string
  done: number
  total: number
  inView: number
  noteCount: number
  compact: boolean
  loading?: boolean
  /** In the desktop app the panel is a page, so it leaves with a Back arrow on the left instead of a close button. */
  back?: boolean
}>()

const { theme, setTheme } = useAppearance()
const { ready: updateReady, restart } = useUpdates()

const emit = defineEmits<{ openNotes: []; toggleSidebar: []; close: [] }>()
const openSettings = useSettingsOpener()
</script>

<template>
  <!-- On a GitHub page the header wraps to two rows below xl; the desktop app's window has the room, so it keeps one row. -->
  <header
    class="flex items-center gap-x-2 gap-y-2 border-b bg-sidebar px-3 py-2 sm:gap-x-3 sm:px-4"
    :class="back ? 'flex-nowrap' : 'flex-wrap xl:flex-nowrap'"
  >
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
    <Button
      v-if="back"
      variant="ghost"
      size="icon-sm"
      class="order-1 shrink-0 text-muted-foreground xl:order-none"
      aria-label="Back"
      @click="emit('close')"
      ><ArrowLeft
    /></Button>
    <div class="order-1 flex min-w-0 flex-1 flex-col xl:order-none xl:flex-initial">
      <div v-if="loading" class="flex h-5 items-center"><Skeleton class="h-3 w-[min(30rem,60vw)]" /></div>
      <h1 v-else class="truncate text-sm leading-5 font-semibold" :title="title">{{ title }}</h1>
      <slot name="meta" />
    </div>
    <Button v-if="!back" variant="ghost" size="icon-sm" class="order-1 shrink-0 xl:hidden" aria-label="Close" @click="emit('close')"
      ><X
    /></Button>
    <div v-if="!back" class="order-2 basis-full xl:hidden" />

    <Skeleton v-if="loading" class="order-3 h-4 w-11 xl:order-none" />
    <div
      v-else
      class="order-3 flex shrink-0 items-center gap-1.5 text-xs font-semibold tabular-nums xl:order-none"
      :title="`${done} of ${total} files viewed · ${total - done} left · ${inView} in the current view`"
    >
      <ProgressRing :done="done" :total="total" />
      <span
        >{{ done }}<span class="font-normal text-muted-foreground">/{{ total }}</span></span
      >
    </div>

    <div v-if="!back" class="order-3 flex-1 xl:order-none" />

    <div class="order-3 flex shrink-0 items-center gap-2 empty:hidden xl:order-none sm:gap-3"><slot name="actions" /></div>

    <Separator orientation="vertical" class="order-3 hidden h-5 sm:block xl:order-none data-[orientation=vertical]:self-center" />

    <Button
      variant="ghost"
      size="icon-sm"
      class="relative order-3 shrink-0 text-muted-foreground xl:order-none"
      title="Your private notes"
      :aria-label="noteCount ? `Notes, ${noteCount} open` : 'Notes'"
      @click="emit('openNotes')"
    >
      <NotepadText />
      <Badge
        v-if="noteCount"
        class="pointer-events-none absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] font-semibold ring-2 ring-sidebar"
        >{{ noteCount }}</Badge
      >
    </Button>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          variant="ghost"
          size="icon-sm"
          class="relative order-3 shrink-0 text-muted-foreground xl:order-none"
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

    <Button v-if="!back" variant="ghost" size="icon-sm" class="hidden shrink-0 xl:inline-flex" aria-label="Close" @click="emit('close')"
      ><X
    /></Button>
  </header>
</template>
