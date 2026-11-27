<script setup lang="ts">
import { computed } from 'vue'

// A size that snaps to stops, each labelled under the rail. Arrow keys step through them; Home and End go to the ends.
const { stops, modelValue, unit, label } = defineProps<{ stops: number[]; modelValue: number; unit: string; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const at = computed(() => Math.max(0, stops.indexOf(modelValue)))
const left = (i: number) => `${(i / (stops.length - 1)) * 100}%`
const text = (v: number) => `${v}${unit}`

function onKey(e: KeyboardEvent) {
  const next =
    e.key === 'ArrowRight' || e.key === 'ArrowUp'
      ? at.value + 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
        ? at.value - 1
        : e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? stops.length - 1
            : null
  if (next === null) return
  e.preventDefault()
  const value = stops[Math.min(stops.length - 1, Math.max(0, next))]!
  if (value !== modelValue) emit('update:modelValue', value)
}
</script>

<template>
  <div class="flex items-center gap-3.5">
    <slot name="small" />
    <div
      role="slider"
      tabindex="0"
      :aria-label="label"
      :aria-valuemin="stops[0]"
      :aria-valuemax="stops[stops.length - 1]"
      :aria-valuenow="modelValue"
      :aria-valuetext="text(modelValue)"
      class="relative h-11 flex-1 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      @keydown="onKey"
    >
      <div class="absolute inset-x-0 top-3.5 h-1 rounded-full bg-input" />
      <div class="absolute top-3.5 left-0 h-1 rounded-full bg-primary transition-[width] duration-150" :style="{ width: left(at) }" />
      <button
        v-for="(v, i) in stops"
        :key="v"
        type="button"
        tabindex="-1"
        class="group absolute top-1.5 -ml-2.5 size-5 cursor-pointer"
        :style="{ left: left(i) }"
        :aria-label="text(v)"
        @click="v !== modelValue && emit('update:modelValue', v)"
      >
        <i class="mx-auto mt-[5px] block h-2.5 w-0.5 rounded-full bg-muted-foreground/50 group-hover:bg-foreground" />
        <span
          class="absolute top-[26px] left-1/2 -translate-x-1/2 text-[11px] whitespace-nowrap tabular-nums"
          :class="v === modelValue ? 'font-medium text-foreground' : 'text-muted-foreground'"
          >{{ text(v) }}</span
        >
      </button>
      <div
        class="pointer-events-none absolute top-1.5 -ml-2.5 size-5 rounded-full bg-primary shadow-[0_0_0_4px] shadow-primary/15 transition-[left] duration-150"
        :style="{ left: left(at) }"
      />
    </div>
    <slot name="large" />
  </div>
</template>
