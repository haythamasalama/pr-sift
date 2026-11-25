<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { X } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

export interface Suggestion {
  value: string
  // A label's colour (hex without #) or a person's avatar, shown before the text.
  color?: string
  avatar?: string
  // Extra words to match and show, such as a person's full name.
  detail?: string
}

const model = defineModel<string[]>({ required: true })
const {
  placeholder,
  label,
  suggestions = [],
  suggestLabel,
  mono = false,
  chips = true,
  search,
} = defineProps<{
  placeholder?: string
  label: string
  suggestions?: Suggestion[]
  suggestLabel?: string
  mono?: boolean
  // Show a few suggestions as chips under the field before anything is typed.
  chips?: boolean
  // Looks further afield (GitHub) for what was typed.
  search?: (text: string) => Promise<Suggestion[]>
}>()
const text = shallowRef('')
const focused = shallowRef(false)
const active = shallowRef(0)
const remote = shallowRef<Suggestion[]>([])
const searching = shallowRef(false)

// Enter, a comma or leaving the field adds what was typed; pasting a list adds every item in it.
function commit() {
  const items = text.value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (items.length) model.value = [...new Set([...model.value, ...items])]
  text.value = ''
}
const drop = (item: string) => (model.value = model.value.filter((x) => x !== item))
function add(item: string) {
  model.value = [...new Set([...model.value, item])]
  text.value = ''
  active.value = 0
}
const decor = (item: string) => [...suggestions, ...remote.value].find((s) => s.value.toLowerCase() === item.toLowerCase())

const taken = computed(() => new Set(model.value.map((x) => x.toLowerCase())))
// Best first: starts with what was typed, then a word in it starts with it, then it appears anywhere.
const matches = computed(() => {
  const q = text.value.trim().toLowerCase()
  const seen = new Set<string>()
  const pool = [...suggestions, ...remote.value].filter((s) => {
    const k = s.value.toLowerCase()
    if (taken.value.has(k) || seen.has(k)) return false
    seen.add(k)
    return true
  })
  if (!q) return pool.slice(0, 8)
  const score = (s: Suggestion) => {
    const v = s.value.toLowerCase()
    const d = (s.detail ?? '').toLowerCase()
    if (v.startsWith(q)) return 0
    if (d.split(/\s+/).some((w) => w.startsWith(q)) || v.split(/[-_/.\s]/).some((w) => w.startsWith(q))) return 1
    if (v.includes(q) || d.includes(q)) return 2
    return 3
  }
  return pool
    .map((s) => ({ s, n: score(s) }))
    .filter((x) => x.n < 3)
    .sort((a, b) => a.n - b.n)
    .slice(0, 8)
    .map((x) => x.s)
})
const menuOpen = computed(() => focused.value && (matches.value.length > 0 || (searching.value && !!text.value.trim())))
watch(matches, () => (active.value = 0))

let timer: ReturnType<typeof setTimeout> | undefined
let asked = 0
watch(text, (value) => {
  clearTimeout(timer)
  if (!search || value.trim().length < 2) {
    searching.value = false
    return
  }
  searching.value = true
  const ticket = ++asked
  timer = setTimeout(async () => {
    const found = await search(value.trim())
    if (ticket !== asked) return
    const known = new Map(remote.value.map((s) => [s.value.toLowerCase(), s]))
    for (const s of found) known.set(s.value.toLowerCase(), s)
    remote.value = [...known.values()]
    searching.value = false
  }, 250)
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' && menuOpen.value) {
    e.preventDefault()
    active.value = (active.value + 1) % matches.value.length
  } else if (e.key === 'ArrowUp' && menuOpen.value) {
    e.preventDefault()
    active.value = (active.value - 1 + matches.value.length) % matches.value.length
  } else if ((e.key === 'Enter' || e.key === 'Tab') && menuOpen.value && text.value.trim() && matches.value[active.value]) {
    e.preventDefault()
    add(matches.value[active.value]!.value)
  } else if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    commit()
  } else if (e.key === 'Escape') {
    focused.value = false
  } else if (e.key === 'Backspace' && !text.value && model.value.length) {
    model.value = model.value.slice(0, -1)
  }
}
function onBlur() {
  focused.value = false
  commit()
}
const chipList = computed(() => (chips && !text.value ? matches.value.slice(0, 5) : []))
</script>

<template>
  <div class="relative flex flex-col gap-1.5">
    <div
      class="flex min-h-8 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-1.5 py-1 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30"
    >
      <Badge
        v-for="item in model"
        :key="item"
        variant="secondary"
        class="h-6 rounded-md text-[12.5px] font-normal"
        :class="{ 'font-mono text-xs': mono }"
      >
        <span v-if="decor(item)?.color" class="size-1.5 rounded-full" :style="{ backgroundColor: `#${decor(item)!.color}` }" />
        <img v-else-if="decor(item)?.avatar" :src="decor(item)!.avatar" alt="" class="size-4 rounded-full" />
        {{ item }}
        <button type="button" class="rounded text-faint hover:text-foreground" :aria-label="`Remove ${item}`" @click="drop(item)">
          <X class="size-3" />
        </button>
      </Badge>
      <input
        v-model="text"
        class="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
        :placeholder="model.length ? '' : placeholder"
        :aria-label="label"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="menuOpen"
        @focus="focused = true"
        @keydown="onKey"
        @blur="onBlur"
      />
    </div>

    <ul
      v-if="menuOpen && text.trim()"
      role="listbox"
      :aria-label="`Suggestions for ${label}`"
      class="absolute top-full right-0 left-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
    >
      <li
        v-for="(s, i) in matches"
        :key="s.value"
        role="option"
        :aria-selected="i === active"
        class="flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm select-none"
        :class="i === active ? 'bg-accent text-accent-foreground' : 'text-foreground'"
        @mousedown.prevent
        @mouseenter="active = i"
        @click="add(s.value)"
      >
        <span v-if="s.color" class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: `#${s.color}` }" />
        <img v-else-if="s.avatar" :src="s.avatar" alt="" class="size-5 shrink-0 rounded-full" />
        <span class="truncate" :class="{ 'font-mono text-xs': mono }">{{ s.value }}</span>
        <span v-if="s.detail" class="truncate text-xs text-muted-foreground">{{ s.detail }}</span>
      </li>
      <li v-if="searching" class="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
        <Spinner class="size-3" /> Looking on GitHub…
      </li>
    </ul>

    <div v-if="chipList.length" class="flex flex-wrap items-center gap-1.5">
      <span v-if="suggestLabel" class="text-xs text-faint">{{ suggestLabel }}</span>
      <Button
        v-for="s in chipList"
        :key="s.value"
        variant="outline"
        size="xs"
        class="font-normal text-muted-foreground"
        :class="{ 'font-mono': mono }"
        @mousedown.prevent
        @click="add(s.value)"
      >
        <span v-if="s.color" class="size-1.5 rounded-full" :style="{ backgroundColor: `#${s.color}` }" />
        <img v-else-if="s.avatar" :src="s.avatar" alt="" class="size-4 rounded-full" />
        {{ s.value }}
      </Button>
    </div>
  </div>
</template>
