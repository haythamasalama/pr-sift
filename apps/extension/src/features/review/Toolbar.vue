<script setup lang="ts">
import { ArrowLeft, NotepadText, PanelLeft, Settings, X } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useSettingsOpener } from '../settings/useSettingsOpener'
import { useUpdates } from '../updates/useUpdates'
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
  /** Leaves out notes and settings, which a worktree in the desktop app does not have. */
  bare?: boolean
}>()

// The gear opens the settings sheet straight away; mode, theme and help live there.
const { ready: updateReady } = useUpdates()

const emit = defineEmits<{ openNotes: []; toggleSidebar: []; close: [] }>()
const openSettings = useSettingsOpener()
</script>

<template>
  <!-- The header follows its own width, not the window's: zoom or a bigger default font in Chrome must not push
       Approve and Merge under the title while there is room beside it. In the desktop app (back) it keeps one row. -->
  <div class="@container">
    <header
      class="flex min-h-14 items-center gap-x-2 gap-y-2 border-b bg-sidebar px-3 py-2 @min-[480px]:gap-x-3 @min-[480px]:px-4"
      :class="back ? 'flex-nowrap' : 'flex-wrap @min-[640px]:flex-nowrap'"
    >
      <Button
        v-if="compact"
        variant="outline"
        size="icon-sm"
        class="order-1 shrink-0 @min-[640px]:order-none"
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
        class="order-1 shrink-0 text-muted-foreground @min-[640px]:order-none"
        aria-label="Back"
        @click="emit('close')"
        ><ArrowLeft
      /></Button>
      <div class="order-1 flex min-w-0 flex-1 flex-col gap-0.5 @min-[640px]:order-none">
        <div v-if="loading" class="flex h-5 items-center"><Skeleton class="h-3 w-[min(30rem,60vw)]" /></div>
        <h1 v-else class="truncate text-sm leading-5 font-semibold" :title="title">{{ title }}</h1>
        <slot name="meta" />
      </div>
      <Button
        v-if="!back"
        variant="ghost"
        size="icon"
        class="order-1 shrink-0 text-muted-foreground @min-[640px]:hidden"
        aria-label="Close"
        @click="emit('close')"
        ><X
      /></Button>
      <div v-if="!back" class="order-2 basis-full @min-[640px]:hidden" />

      <Skeleton v-if="loading" class="order-3 h-4 w-11 @min-[640px]:order-none" />
      <div
        v-else
        class="order-3 flex shrink-0 items-center gap-1.5 px-1 text-xs font-semibold tabular-nums @min-[640px]:order-none"
        :title="`${done} of ${total} files viewed · ${total - done} left · ${inView} in the current view`"
      >
        <ProgressRing :done="done" :total="total" />
        <span
          >{{ done }}<span class="font-normal text-muted-foreground">/{{ total }}</span></span
        >
      </div>

      <div v-if="!back" class="order-3 flex-1 @min-[640px]:hidden" />

      <div class="order-3 flex shrink-0 items-center gap-2 @min-[640px]:order-none">
        <div class="flex shrink-0 items-center gap-2 empty:hidden"><slot name="actions" /></div>

        <template v-if="!bare">
          <Separator orientation="vertical" class="mx-0.5 hidden h-5 @min-[480px]:block data-[orientation=vertical]:self-center" />

          <!-- Room for what the page around the review adds, such as the desktop app's Share menu. -->
          <slot name="tools" />

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

          <Button
            variant="ghost"
            size="icon"
            class="relative shrink-0 text-muted-foreground"
            :aria-label="updateReady ? 'Settings, update ready' : 'Settings'"
            :title="updateReady ? `Settings · PR Sift ${updateReady} is ready` : 'Settings'"
            @click="openSettings(updateReady ? 'about' : undefined)"
          >
            <Settings />
            <span v-if="updateReady" class="absolute -top-1 -right-1 size-2 rounded-full bg-attention ring-2 ring-background" />
          </Button>
        </template>

        <Button
          v-if="!back"
          variant="ghost"
          size="icon"
          class="hidden shrink-0 text-muted-foreground @min-[640px]:inline-flex"
          aria-label="Close"
          @click="emit('close')"
          ><X
        /></Button>
      </div>
    </header>
  </div>
</template>
