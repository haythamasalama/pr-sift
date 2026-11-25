<script setup lang="ts">
import { shallowRef } from 'vue'
import { X } from '@lucide/vue'

export interface Suggestion {
  value: string
  // A label's colour (hex without #) or a person's avatar, shown before the text.
  color?: string
  avatar?: string
}

const model = defineModel<string[]>({ required: true })
const {
  placeholder,
  label,
  suggestions = [],
  suggestLabel,
  mono = false,
} = defineProps<{ placeholder?: string; label: string; suggestions?: Suggestion[]; suggestLabel?: string; mono?: boolean }>()
const text = shallowRef('')

// Enter, a comma or leaving the field adds what was typed; pasting a list adds every item in it.
function commit() {
  const items = text.value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (items.length) model.value = [...new Set([...model.value, ...items])]
  text.value = ''
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    commit()
  } else if (e.key === 'Backspace' && !text.value && model.value.length) {
    model.value = model.value.slice(0, -1)
  }
}
const drop = (item: string) => (model.value = model.value.filter((x) => x !== item))
const add = (item: string) => (model.value = [...new Set([...model.value, item])])
const decor = (item: string) => suggestions.find((s) => s.value.toLowerCase() === item.toLowerCase())
const open = () => {
  const q = text.value.trim().toLowerCase()
  const taken = new Set(model.value.map((x) => x.toLowerCase()))
  return suggestions.filter((s) => !taken.has(s.value.toLowerCase()) && (!q || s.value.toLowerCase().includes(q))).slice(0, q ? 8 : 5)
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div
      class="flex min-h-[34px] w-full flex-wrap items-center gap-1.5 rounded-[7px] border border-border bg-secondary px-2 py-1 focus-within:border-ring/60"
    >
      <span
        v-for="item in model"
        :key="item"
        class="flex h-6 items-center gap-1.5 rounded-md bg-accent px-2 text-[12.5px]"
        :class="{ 'font-mono text-xs': mono }"
      >
        <span v-if="decor(item)?.color" class="size-1.5 rounded-full" :style="{ backgroundColor: `#${decor(item)!.color}` }" />
        <img v-else-if="decor(item)?.avatar" :src="decor(item)!.avatar" alt="" class="size-4 rounded-full" />
        {{ item }}
        <button type="button" class="rounded text-faint hover:text-foreground" :aria-label="`Remove ${item}`" @click="drop(item)">
          <X class="size-3" />
        </button>
      </span>
      <input
        v-model="text"
        class="min-w-24 flex-1 bg-transparent px-1 text-[13px] outline-none placeholder:text-faint"
        :placeholder="model.length ? '' : placeholder"
        :aria-label="label"
        @keydown="onKey"
        @blur="commit"
      />
    </div>
    <div v-if="open().length" class="flex flex-wrap items-center gap-1.5">
      <span v-if="suggestLabel" class="text-xs text-faint">{{ suggestLabel }}</span>
      <button
        v-for="s in open()"
        :key="s.value"
        type="button"
        class="flex h-6 items-center gap-1.5 rounded-md border border-dashed border-input px-2 text-xs text-muted-foreground transition-colors hover:border-ring/60 hover:text-foreground"
        :class="{ 'font-mono': mono }"
        @mousedown.prevent
        @click="add(s.value)"
      >
        <span v-if="s.color" class="size-1.5 rounded-full" :style="{ backgroundColor: `#${s.color}` }" />
        <img v-else-if="s.avatar" :src="s.avatar" alt="" class="size-4 rounded-full" />
        {{ s.value }}
      </button>
    </div>
  </div>
</template>
