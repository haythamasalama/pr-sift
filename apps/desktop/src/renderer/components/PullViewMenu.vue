<script setup lang="ts">
import { computed } from 'vue'
import { SlidersHorizontal } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { PULL_DETAIL_GROUPS, usePullView, type PullDensity } from '~/pulls/view'
import Segmented from './Segmented.vue'
import LabelChip from './LabelChip.vue'
import StatusPill from './StatusPill.vue'

// Which details the pull request rows show, with a sample row that follows each switch. Holds for every list.
const { shown, density, set, setDensity, reset, hidden, changed } = usePullView()
const compact = computed(() => density.value === 'compact')
const DENSITIES: { value: PullDensity; label: string }[] = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
]
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button size="sm" variant="outline"
        ><SlidersHorizontal /> View<span v-if="hidden()" class="text-muted-foreground">· {{ hidden() }} hidden</span></Button
      >
    </PopoverTrigger>
    <PopoverContent align="end" class="max-h-[min(var(--reka-popover-content-available-height),640px)] w-[400px] gap-0 overflow-hidden p-0">
      <div class="flex shrink-0 flex-col gap-2 border-b border-border p-3.5">
        <span class="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">Preview</span>
        <div
          class="flex items-center gap-3 rounded-md border border-border bg-background"
          :class="compact ? 'px-2.5 py-1.5' : 'px-3 py-2.5'"
        >
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <div class="flex min-w-0 items-center gap-2">
              <span class="truncate font-semibold" :class="compact ? 'text-[13px]' : 'text-[15px] leading-5'"
                >perf(orders): skip the unused total count in the search</span
              >
              <LabelChip v-if="shown.labels" :label="{ name: 'refactor', color: 'c5def5' }" />
            </div>
            <div class="flex min-w-0 items-center gap-2 overflow-hidden text-xs whitespace-nowrap text-muted-foreground">
              <span class="tabular-nums">#11364</span>
              <span v-if="shown.author" class="flex items-center gap-1.5"
                ><span class="flex size-4 items-center justify-center rounded-full bg-success-fg text-[9px] font-semibold text-background"
                  >A</span
                >ali-m</span
              >
              <span v-if="shown.branch" class="min-w-[8ch] truncate font-mono text-[11px]">perf/order-id-search-count</span>
              <span v-if="shown.time">3 h ago</span>
              <span v-if="shown.size" class="tabular-nums"
                ><span class="text-success-fg">+1</span> <span class="text-destructive">−2</span></span
              >
              <span v-if="shown.comments">2 comments</span>
            </div>
          </div>
          <StatusPill v-if="shown.ci" tone="success" bare aria-label="Checks passed" class="gap-0" />
          <StatusPill v-if="shown.review" tone="success">Approved</StatusPill>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto py-1">
        <template v-for="g in PULL_DETAIL_GROUPS" :key="g.title">
          <p class="px-3.5 pt-3 pb-1 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">{{ g.title }}</p>
          <label v-for="o in g.items" :key="o.value" class="flex h-8 cursor-pointer items-center gap-3 px-3.5 text-sm hover:bg-accent">
            <Switch :model-value="shown[o.value]" :aria-label="o.label" @update:model-value="(v) => set(o.value, !!v)" />
            <span>{{ o.label }}</span>
            <span class="ml-auto text-xs text-muted-foreground">{{ o.hint }}</span>
          </label>
        </template>
        <p class="px-3.5 pt-3 pb-1.5 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">Density</p>
        <div class="px-3.5 pb-3">
          <Segmented
            :model-value="density"
            :options="DENSITIES"
            label="Row density"
            class="w-full [&>*]:flex-1"
            @update:model-value="setDensity"
          />
        </div>
      </div>

      <div class="flex shrink-0 items-center justify-between border-t border-border px-3.5 py-2 text-xs text-muted-foreground">
        <span>Applies to every list</span>
        <Button variant="ghost" size="sm" class="h-7 px-2" :disabled="!changed()" @click="reset">Reset</Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
