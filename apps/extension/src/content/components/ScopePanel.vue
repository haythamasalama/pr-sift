<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ChevronRight, Search, X } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { scopeLabel, type ScopeGroup, type SmartScopes } from '@pr-sift/core'
import ScopeChip from './ScopeChip.vue'
import ScopeRow from './ScopeRow.vue'

const { smart, selected } = defineProps<{ smart: SmartScopes; selected: string[] }>()
const emit = defineEmits<{ toggle: [key: string]; clear: [] }>()

const query = shallowRef('')
const groupLimit = shallowRef(5)
const toggled = shallowRef<Record<string, boolean>>({})

const searching = computed(() => query.value.trim().length > 0)
const matches = (text: string) => !searching.value || text.toLowerCase().includes(query.value.trim().toLowerCase())

const categories = computed(() => smart.categories.filter((c) => matches(c.label)))
const recurring = computed(() => smart.recurring.filter((c) => matches(c.label)))
const maxRecurring = computed(() => Math.max(0, ...recurring.value.map((c) => c.count)))

const groups = computed(() =>
  smart.groups
    .map((g) => ({ ...g, items: searching.value ? g.items.filter((i) => matches(i.label) || matches(g.parent)) : g.items }))
    .filter((g) => g.items.length),
)
const shownGroups = computed(() => (searching.value ? groups.value : groups.value.slice(0, groupLimit.value)))

const isOpen = (g: ScopeGroup, index: number) => searching.value || (toggled.value[g.parent] ?? (index < 2 && g.parent !== ''))
const setOpen = (g: ScopeGroup, open: boolean) => (toggled.value = { ...toggled.value, [g.parent]: open })
const lastSegment = (path: string) => path.split('/').pop() ?? path
const prefix = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '')
</script>

<template>
  <div class="flex h-full flex-col gap-5 overflow-auto p-3 text-xs">
    <div class="relative flex items-center">
      <Search class="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
      <Input v-model="query" type="search" placeholder="Search folders…" class="h-8 pl-8 text-xs md:text-xs" />
    </div>

    <div v-if="selected.length" class="flex flex-col gap-1.5 rounded-md border border-primary/40 bg-primary/10 p-2">
      <div class="flex items-center justify-between">
        <span class="font-medium text-primary">Showing only</span>
        <Button variant="ghost" size="xs" @click="emit('clear')">Clear</Button>
      </div>
      <div class="flex flex-wrap gap-1">
        <Badge v-for="key in selected" :key="key" as="button" class="cursor-pointer gap-1" @click="emit('toggle', key)">
          {{ scopeLabel(key) }} <X />
        </Badge>
      </div>
    </div>

    <section v-if="categories.length" class="flex flex-col gap-1.5">
      <h3 class="px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Quick</h3>
      <div class="flex flex-wrap gap-1">
        <ScopeChip
          v-for="c in categories"
          :key="c.key"
          :label="c.label"
          :count="c.count"
          :active="selected.includes(c.key)"
          @click="emit('toggle', c.key)"
        />
      </div>
    </section>

    <section v-if="recurring.length" class="flex flex-col gap-0.5">
      <h3 class="mb-1 px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Recurring folders</h3>
      <ScopeRow
        v-for="c in recurring"
        :key="c.key"
        :label="c.label"
        :count="c.count"
        :max="maxRecurring"
        :hint="c.hint"
        :active="selected.includes(c.key)"
        @click="emit('toggle', c.key)"
      />
    </section>

    <section v-if="shownGroups.length" class="flex flex-col gap-1.5">
      <h3 class="px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">By parent folder</h3>
      <Collapsible
        v-for="(g, index) in shownGroups"
        :key="g.parent"
        :open="isOpen(g, index)"
        class="rounded-md border bg-background"
        @update:open="(open: boolean) => setOpen(g, open)"
      >
        <div class="flex items-center gap-1 px-1.5 py-1.5">
          <CollapsibleTrigger as-child>
            <Button variant="ghost" size="icon-xs" aria-label="Toggle group"
              ><ChevronRight class="transition-transform" :class="isOpen(g, index) ? 'rotate-90' : ''"
            /></Button>
          </CollapsibleTrigger>
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-1 text-left font-mono text-[11px]"
            :class="selected.includes('path:' + g.parent) ? 'text-primary' : ''"
            :disabled="!g.parent"
            @click="g.parent && emit('toggle', 'path:' + g.parent)"
          >
            <template v-if="g.parent">
              <span class="truncate text-muted-foreground">{{ prefix(g.parent) }}</span
              ><span class="font-semibold">{{ lastSegment(g.parent) }}</span>
            </template>
            <span v-else class="font-semibold">Top level</span>
          </button>
          <span class="shrink-0 pr-1 text-muted-foreground tabular-nums">{{ g.total }}</span>
        </div>
        <CollapsibleContent class="flex flex-col gap-0.5 border-t p-1">
          <ScopeRow
            v-for="i in g.items"
            :key="i.key"
            :label="i.label"
            :count="i.count"
            :max="g.items[0]?.count ?? 0"
            :active="selected.includes(i.key)"
            @click="emit('toggle', i.key)"
          />
        </CollapsibleContent>
      </Collapsible>
      <Button v-if="!searching && groups.length > groupLimit" size="sm" variant="ghost" @click="groupLimit += 6"
        >Show {{ groups.length - groupLimit }} more</Button
      >
    </section>

    <p v-if="!categories.length && !recurring.length && !shownGroups.length" class="px-1 text-muted-foreground">Nothing matches.</p>
  </div>
</template>
