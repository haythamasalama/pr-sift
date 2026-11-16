<script setup lang="ts">
import { shallowRef } from 'vue'
import { Plus, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const { label, placeholder } = defineProps<{ label: string; placeholder: string }>()
const model = defineModel<string[]>({ required: true })

const draft = shallowRef('')

function add() {
  const value = draft.value.trim()
  draft.value = ''
  if (value && !model.value.includes(value)) model.value = [...model.value, value]
}

const remove = (value: string) => (model.value = model.value.filter((item) => item !== value))
</script>

<template>
  <div class="flex flex-col gap-2">
    <ul v-if="model.length" class="flex flex-wrap gap-1.5" :aria-label="label">
      <li
        v-for="item in model"
        :key="item"
        class="inline-flex h-6 items-center gap-1 rounded-md border bg-muted/40 pr-0.5 pl-2 font-mono text-[11px]"
      >
        {{ item }}
        <Button variant="ghost" size="icon-xs" class="size-5" :aria-label="`Remove ${item}`" @click="remove(item)"><X /></Button>
      </li>
    </ul>
    <form class="flex gap-2" @submit.prevent="add">
      <Input
        v-model="draft"
        :aria-label="`Add to ${label}`"
        :placeholder="placeholder"
        spellcheck="false"
        class="h-7 font-mono text-xs md:text-xs"
      />
      <Button type="submit" variant="outline" size="sm" :disabled="!draft.trim()"><Plus /> Add</Button>
    </form>
  </div>
</template>
