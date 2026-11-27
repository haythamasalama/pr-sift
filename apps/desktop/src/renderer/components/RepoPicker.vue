<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ChevronDown, Search, X } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// Picks repositories from a menu: your projects, the repositories asking for your review, and "every repo of an owner".
const model = defineModel<string[]>({ required: true })
const { options } = defineProps<{ options: string[] }>()
const query = shallowRef('')

const avatar = (full: string) => `https://avatars.githubusercontent.com/${encodeURIComponent(full.split('/')[0]!)}?s=32`
const owners = computed(() => [...new Set(options.map((o) => o.split('/')[0]!))].sort())
const all = computed(() => {
  const list = [...new Set([...model.value, ...options, ...owners.value.map((o) => `${o}/*`)])]
  const q = query.value.trim().toLowerCase()
  return list.filter((x) => !q || x.includes(q))
})
const has = (x: string) => model.value.includes(x)
const flip = (x: string, on: boolean) => (model.value = on ? [...new Set([...model.value, x])] : model.value.filter((v) => v !== x))
// A repository not in the menu can still be typed as owner/name.
const canAdd = computed(() => /^[\w.-]+\/(\*|[\w.-]+)$/.test(query.value.trim()) && !all.value.includes(query.value.trim().toLowerCase()))
function addTyped() {
  if (!canAdd.value) return
  flip(query.value.trim().toLowerCase(), true)
  query.value = ''
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <button
        type="button"
        class="flex min-h-8 w-full items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:border-ring dark:bg-input/30"
        aria-label="Repositories"
      >
        <span class="flex min-w-0 flex-1 flex-wrap gap-1.5">
          <span v-if="!model.length" class="text-muted-foreground">Any repository</span>
          <Badge v-for="r in model" :key="r" variant="secondary" class="h-6 rounded-md text-[12.5px] font-normal">
            <img :src="avatar(r)" alt="" class="size-4 rounded-[3px]" />{{ r }}
            <span
              role="button"
              tabindex="0"
              class="rounded text-faint hover:text-foreground"
              :aria-label="`Remove ${r}`"
              @click.stop="flip(r, false)"
              @keydown.enter.stop.prevent="flip(r, false)"
              ><X class="size-3"
            /></span>
          </Badge>
        </span>
        <ChevronDown class="size-4 shrink-0 text-faint" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-(--reka-popover-trigger-width) gap-1 p-1.5">
      <InputGroup class="mb-1">
        <InputGroupAddon><Search /></InputGroupAddon>
        <InputGroupInput
          v-model="query"
          placeholder="Search, or type owner/repo"
          aria-label="Search repositories"
          @keydown.enter.prevent="addTyped"
        />
      </InputGroup>
      <div class="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
        <button
          v-if="canAdd"
          type="button"
          class="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-emphasis hover:bg-accent"
          @click="addTyped"
        >
          Add {{ query.trim().toLowerCase() }}
        </button>
        <label
          v-for="r in all"
          :key="r"
          class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-accent"
          :class="{ 'bg-accent/60': has(r) }"
        >
          <Checkbox :model-value="has(r)" @update:model-value="(v) => flip(r, v === true)" />
          <img :src="avatar(r)" alt="" class="size-4 rounded-[3px]" />
          <span v-if="r.endsWith('/*')" class="text-muted-foreground"
            ><span class="font-mono">{{ r }}</span> every repo of {{ r.slice(0, -2) }}</span
          >
          <span v-else class="truncate">{{ r }}</span>
        </label>
        <p v-if="!all.length && !canAdd" class="px-2 py-1.5 text-xs text-faint">Nothing matches.</p>
      </div>
    </PopoverContent>
  </Popover>
</template>
