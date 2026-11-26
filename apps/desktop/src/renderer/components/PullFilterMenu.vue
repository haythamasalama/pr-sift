<script setup lang="ts">
import { computed } from 'vue'
import { ListFilter, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { PullItem } from '~/github'
import { CI_STATES, NO_FILTERS, REVIEW_STATES, filterChoices, filterCount, type PullFilterKind, type PullFilters } from '~/pulls/filters'

// A Filter button with a menu per kind (author, label, review, checks), and the active filters as chips beside it.
const props = defineProps<{ pulls: PullItem[] }>()
const model = defineModel<PullFilters>({ required: true })

const choices = computed(() => filterChoices(props.pulls))
const KIND_LABEL: Record<PullFilterKind, string> = { author: 'Author', label: 'Label', review: 'Review', ci: 'Checks' }
const STATE_LABEL: Record<string, string> = Object.fromEntries([...REVIEW_STATES, ...CI_STATES].map((s) => [s.value, s.label]))

function toggle(kind: PullFilterKind, value: string, on: boolean) {
  const list = model.value[kind].filter((v) => v !== value)
  model.value = { ...model.value, [kind]: on ? [...list, value] : list }
}
const active = computed(() =>
  (Object.keys(KIND_LABEL) as PullFilterKind[]).flatMap((kind) =>
    model.value[kind].map((value) => ({ kind, value, text: kind === 'review' || kind === 'ci' ? STATE_LABEL[value] : value })),
  ),
)
const colorOf = (name: string) => choices.value.labels.find((l) => l.name === name)?.color
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button size="sm" variant="outline"
        ><ListFilter /> Filter<span v-if="filterCount(model)" class="text-muted-foreground">· {{ filterCount(model) }}</span></Button
      >
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-48">
      <DropdownMenuSub>
        <DropdownMenuSubTrigger :disabled="!choices.authors.length">Author</DropdownMenuSubTrigger>
        <DropdownMenuSubContent class="max-h-80 w-56 overflow-y-auto">
          <DropdownMenuCheckboxItem
            v-for="a in choices.authors"
            :key="a.login"
            :model-value="model.author.includes(a.login)"
            @update:model-value="(v) => toggle('author', a.login, !!v)"
            @select.prevent
          >
            <img v-if="a.avatarUrl" :src="a.avatarUrl" alt="" class="size-4 rounded-full" />
            <span class="flex-1 truncate">{{ a.login }}</span>
            <span class="text-xs text-muted-foreground tabular-nums">{{ a.count }}</span>
          </DropdownMenuCheckboxItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger :disabled="!choices.labels.length">Label</DropdownMenuSubTrigger>
        <DropdownMenuSubContent class="max-h-80 w-56 overflow-y-auto">
          <DropdownMenuCheckboxItem
            v-for="l in choices.labels"
            :key="l.name"
            :model-value="model.label.includes(l.name)"
            @update:model-value="(v) => toggle('label', l.name, !!v)"
            @select.prevent
          >
            <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: `#${l.color}` }" />
            <span class="flex-1 truncate">{{ l.name }}</span>
            <span class="text-xs text-muted-foreground tabular-nums">{{ l.count }}</span>
          </DropdownMenuCheckboxItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>Review</DropdownMenuSubTrigger>
        <DropdownMenuSubContent class="w-48">
          <DropdownMenuCheckboxItem
            v-for="s in REVIEW_STATES"
            :key="s.value"
            :model-value="model.review.includes(s.value)"
            @update:model-value="(v) => toggle('review', s.value, !!v)"
            @select.prevent
            >{{ s.label }}</DropdownMenuCheckboxItem
          >
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>Checks</DropdownMenuSubTrigger>
        <DropdownMenuSubContent class="w-48">
          <DropdownMenuCheckboxItem
            v-for="s in CI_STATES"
            :key="s.value"
            :model-value="model.ci.includes(s.value)"
            @update:model-value="(v) => toggle('ci', s.value, !!v)"
            @select.prevent
            >{{ s.label }}</DropdownMenuCheckboxItem
          >
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <template v-if="filterCount(model)">
        <DropdownMenuSeparator />
        <DropdownMenuItem @select="model = { ...NO_FILTERS }">Clear filters</DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
  <span
    v-for="f in active"
    :key="`${f.kind}:${f.value}`"
    class="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-muted pr-1 pl-2 text-xs"
  >
    <span class="text-muted-foreground">{{ KIND_LABEL[f.kind] }}</span>
    <span v-if="f.kind === 'label'" class="size-1.5 rounded-full" :style="{ backgroundColor: `#${colorOf(f.value)}` }" />
    {{ f.text }}
    <button
      type="button"
      class="rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      :aria-label="`Remove the ${KIND_LABEL[f.kind].toLowerCase()} filter ${f.text}`"
      @click="toggle(f.kind, f.value, false)"
    >
      <X class="size-3" />
    </button>
  </span>
</template>
