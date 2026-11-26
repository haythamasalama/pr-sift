<script setup lang="ts">
import { computed } from 'vue'
import { Check, ChevronDown, GitCommitHorizontal } from '@lucide/vue'
import { timeAgo } from '@pr-sift/core'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { pickRange, type CommitRange, type PrCommit } from './commits'

const { commits } = defineProps<{ commits: PrCommit[] }>()
const range = defineModel<CommitRange | null>({ default: null })

const label = computed(() => {
  const r = range.value
  if (!r) return `${commits.length} commit${commits.length === 1 ? '' : 's'}`
  return r.from === r.to ? commits[r.from]!.short : `${commits[r.from]!.short}..${commits[r.to]!.short}`
})
const inRange = (i: number) => !!range.value && i >= range.value.from && i <= range.value.to

function pick(index: number, event: Event) {
  const shift = !!(event as CustomEvent<{ originalEvent?: PointerEvent }>).detail?.originalEvent?.shiftKey
  // Shift-click keeps the menu open so the range can be seen before closing it.
  if (shift && range.value) event.preventDefault()
  range.value = pickRange(range.value, index, shift)
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="inline-flex shrink-0 items-center gap-1 rounded-sm hover:text-foreground"
        :class="range ? 'border px-1 font-mono text-foreground' : ''"
        :title="range ? 'Showing only some commits. Pick another or go back to all changes' : 'See the changes of one commit or a range'"
      >
        <GitCommitHorizontal class="size-3" />{{ label }}<ChevronDown class="size-3" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-[30rem] max-w-[90vw]">
      <DropdownMenuItem @select="range = null">
        <Check class="size-3.5 text-success-fg" :class="range ? 'invisible' : ''" />
        <span class="font-medium">All changes</span>
        <span class="ml-auto text-xs text-muted-foreground">{{ commits.length }} commits</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Show one commit</DropdownMenuLabel>
      <div class="max-h-72 overflow-y-auto">
        <DropdownMenuItem
          v-for="(c, i) in commits"
          :key="c.sha"
          :class="inRange(i) ? 'bg-accent/60' : ''"
          :title="c.message"
          @select="(e: Event) => pick(i, e)"
        >
          <Avatar class="size-4">
            <AvatarImage v-if="c.avatar" :src="c.avatar" alt="" />
            <AvatarFallback class="text-[8px] uppercase">{{ c.author.slice(0, 1) }}</AvatarFallback>
          </Avatar>
          <span class="min-w-0 flex-1 truncate">{{ c.message }}</span>
          <span class="shrink-0 font-mono text-xs text-muted-foreground">{{ c.short }}</span>
          <span class="w-20 shrink-0 text-right text-xs text-muted-foreground">{{ timeAgo(c.date) }}</span>
        </DropdownMenuItem>
      </div>
      <DropdownMenuSeparator />
      <p class="px-2 py-1 text-[11px] text-muted-foreground">Shift-click a second commit to see a range</p>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
