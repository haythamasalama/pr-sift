<script setup lang="ts">
import { shallowRef } from 'vue'
import { X } from '@lucide/vue'

const model = defineModel<string[]>({ required: true })
const { placeholder, label } = defineProps<{ placeholder?: string; label: string }>()
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
</script>

<template>
  <div
    class="flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border border-input px-1.5 py-1 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30"
  >
    <span v-for="item in model" :key="item" class="flex items-center gap-0.5 rounded-md bg-secondary px-1.5 py-0.5 font-mono text-xs">
      {{ item }}
      <button type="button" class="rounded text-muted-foreground hover:text-foreground" :aria-label="`Remove ${item}`" @click="drop(item)">
        <X class="size-3" />
      </button>
    </span>
    <input
      v-model="text"
      class="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
      :placeholder="model.length ? '' : placeholder"
      :aria-label="label"
      @keydown="onKey"
      @blur="commit"
    />
  </div>
</template>
