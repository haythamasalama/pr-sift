<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ChevronDown, Search, X } from '@lucide/vue'
import { Checkbox } from '@/components/ui/checkbox'
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
        class="flex min-h-[34px] w-full items-center gap-1.5 rounded-[7px] border border-border bg-secondary px-2 py-1 text-left data-[state=open]:border-ring/60"
        aria-label="Repositories"
      >
        <span class="flex min-w-0 flex-1 flex-wrap gap-1.5">
          <span v-if="!model.length" class="px-1 text-[13px] text-faint">Any repository</span>
          <span v-for="r in model" :key="r" class="flex h-6 items-center gap-1.5 rounded-md bg-accent px-2 text-[12.5px]">
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
          </span>
        </span>
        <ChevronDown class="size-4 shrink-0 text-faint" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-(--reka-popover-trigger-width) gap-1 p-1.5">
      <label class="mb-1 flex h-[30px] items-center gap-2 rounded-md bg-background px-2 text-faint">
        <Search class="size-3.5" />
        <input
          v-model="query"
          class="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-faint"
          placeholder="Search, or type owner/repo"
          aria-label="Search repositories"
          @keydown.enter.prevent="addTyped"
        />
      </label>
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
