<script setup lang="ts">
import { CircleHelp, Monitor, Moon, NotepadText, PanelLeft, RotateCw, Settings, Sun, X } from '@lucide/vue'
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
import GithubMark from '../../components/GithubMark.vue'
import ShadcnMark from '../../components/ShadcnMark.vue'
import { THEME_STYLES, useAppearance } from '../appearance/useAppearance'
import { useSettingsOpener } from '../settings/useSettingsOpener'
import { useUpdates } from '../updates/useUpdates'
import type { ThemeMode, ThemeStyle } from '../../lib/types'
import ProgressRing from './ProgressRing.vue'

defineProps<{
  title: string
  done: number
  total: number
  inView: number
  noteCount: number
  compact: boolean
  loading?: boolean
}>()

const { theme, setTheme, themeStyle, setThemeStyle } = useAppearance()
const STYLE_ICONS = { github: GithubMark, shadcn: ShadcnMark }
const { ready: updateReady, restart } = useUpdates()

const emit = defineEmits<{ openNotes: []; toggleSidebar: []; close: [] }>()
const openSettings = useSettingsOpener()
</script>

<template>
  <header class="flex min-h-14 flex-wrap items-center gap-x-2 gap-y-2 border-b bg-sidebar px-3 py-2 sm:gap-x-3 sm:px-4 xl:flex-nowrap">
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
    <div class="order-1 flex min-w-0 flex-1 flex-col gap-0.5 xl:order-none">
      <div v-if="loading" class="flex h-5 items-center"><Skeleton class="h-3 w-[min(30rem,60vw)]" /></div>
      <h1 v-else class="truncate text-sm leading-5 font-semibold" :title="title">{{ title }}</h1>
      <slot name="meta" />
    </div>
    <Button variant="ghost" size="icon" class="order-1 shrink-0 text-muted-foreground xl:hidden" aria-label="Close" @click="emit('close')"
      ><X
    /></Button>
    <div class="order-2 basis-full xl:hidden" />

    <Skeleton v-if="loading" class="order-3 h-4 w-11 xl:order-none" />
    <div
      v-else
      class="order-3 flex shrink-0 items-center gap-1.5 px-1 text-xs font-semibold tabular-nums xl:order-none"
      :title="`${done} of ${total} files viewed · ${total - done} left · ${inView} in the current view`"
    >
      <ProgressRing :done="done" :total="total" />
      <span
        >{{ done }}<span class="font-normal text-muted-foreground">/{{ total }}</span></span
      >
    </div>

    <div class="order-3 flex-1 xl:hidden" />

    <div class="order-3 flex shrink-0 items-center gap-2 xl:order-none">
      <div class="flex shrink-0 items-center gap-2 empty:hidden"><slot name="actions" /></div>

      <Separator orientation="vertical" class="mx-0.5 hidden h-5 sm:block data-[orientation=vertical]:self-center" />

      <Button
        variant="ghost"
        size="icon"
        class="relative shrink-0 text-muted-foreground"
        title="Your private notes"
        :aria-label="noteCount ? `Notes, ${noteCount} open` : 'Notes'"
        @click="emit('openNotes')"
      >
        <NotepadText />
        <Badge
          v-if="noteCount"
          class="pointer-events-none absolute top-px right-0 h-[15px] min-w-[15px] px-1 text-[10px] font-bold ring-2 ring-sidebar"
          >{{ noteCount }}</Badge
        >
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="relative shrink-0 text-muted-foreground"
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
            <DropdownMenuLabel>Style</DropdownMenuLabel>
            <DropdownMenuRadioGroup :model-value="themeStyle" @update:model-value="(v) => setThemeStyle(v as ThemeStyle)">
              <DropdownMenuRadioItem v-for="s in THEME_STYLES" :key="s.value" :value="s.value">
                <component :is="STYLE_ICONS[s.value]" /> {{ s.label }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
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

      <Button
        variant="ghost"
        size="icon"
        class="hidden shrink-0 text-muted-foreground xl:inline-flex"
        aria-label="Close"
        @click="emit('close')"
        ><X
      /></Button>
    </div>
  </header>
</template>
