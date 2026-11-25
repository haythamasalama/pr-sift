<script setup lang="ts" generic="T extends string">
// A quiet segmented control: the chosen option is a raised chip, counts sit beside each label.
const model = defineModel<T>({ required: true })
defineProps<{ options: { value: T; label: string; count?: number }[]; label: string }>()
</script>

<template>
  <div role="radiogroup" :aria-label="label" class="flex h-8 shrink-0 items-center rounded-[7px] border border-border bg-secondary p-0.5">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="radio"
      :aria-checked="model === o.value"
      class="flex h-[26px] items-center gap-1.5 rounded-[5px] px-2.5 text-[12.5px] whitespace-nowrap transition-colors"
      :class="model === o.value ? 'bg-input font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'"
      @click="model = o.value"
    >
      {{ o.label
      }}<span v-if="o.count !== undefined" class="tabular-nums" :class="model === o.value ? 'text-muted-foreground' : 'text-faint'">{{
        o.count
      }}</span>
    </button>
  </div>
</template>
