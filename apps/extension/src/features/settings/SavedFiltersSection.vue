<script setup lang="ts">
import { computed, nextTick, useTemplateRef } from 'vue'
import { Plus, Trash2 } from '@lucide/vue'
import { cleanSavedFilters, matcher, missingExamples, splitLines, type SavedFilter } from '@pr-sift/core'
import { Button } from '@/components/ui/button'
import { FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { Preset, PrFile } from '../../lib/types'
import SettingsGroup from './SettingsGroup.vue'
import { useNewMarks } from './useNewMarks'
import { useDraft } from './useDraft'

interface FilterDraft {
  key: number
  name: string
  patterns: string
  includeHidden: boolean
}

const model = defineModel<Preset[]>({ required: true })
const { files } = defineProps<{ files?: PrFile[] }>()

let nextKey = 0
const blank = (): FilterDraft => ({ key: nextKey++, name: '', patterns: '', includeHidden: false })

// Filters saved by the old JSON editor were not checked, so a stored entry may miss a field.
const toDraft = (filter: Partial<Preset>): FilterDraft => ({
  ...blank(),
  name: typeof filter.name === 'string' ? filter.name : '',
  patterns: Array.isArray(filter.include) ? filter.include.filter((p) => typeof p === 'string').join('\n') : '',
  includeHidden: filter.includeHidden === true,
})

const toFilter = (draft: FilterDraft): SavedFilter => ({
  name: draft.name,
  include: splitLines(draft.patterns),
  includeHidden: draft.includeHidden,
})

const { isNew, markSeen } = useNewMarks()

const { draft, schedule, flush, save } = useDraft({
  source: () => model.value,
  commit: (value) => {
    model.value = value
    void markSeen('saved-filters')
  },
  toDraft: (filters) => filters.map(toDraft),
  fromDraft: (drafts) => cleanSavedFilters(drafts.map(toFilter)),
})

const examples = computed(() => missingExamples(draft.value))
const root = useTemplateRef<InstanceType<typeof SettingsGroup>>('root')

const problems = computed(() => {
  const seen = new Set<string>()
  return draft.value.map((filter) => {
    const name = filter.name.trim().toLowerCase()
    if (!name || !splitLines(filter.patterns).length) return 'Needs a name and at least one path to show in the review.'
    if (seen.has(name)) return 'Another filter already uses this name, so this one is not shown.'
    seen.add(name)
    return ''
  })
})

function matches(filter: FilterDraft): string {
  const patterns = splitLines(filter.patterns)
  if (!files || !patterns.length) return ''
  const inFilter = matcher(patterns)
  const count = files.filter((f) => inFilter(f.filename)).length
  return `Matches ${count} file${count === 1 ? '' : 's'} in this pull request`
}

async function add() {
  const filter = blank()
  draft.value.push(filter)
  await nextTick()
  const section = root.value?.$el as HTMLElement | undefined
  section?.querySelector<HTMLInputElement>(`[data-filter="${filter.key}"] input`)?.focus()
}

function addExample(example: SavedFilter) {
  draft.value.push(toDraft(example))
  save()
}

function remove(index: number) {
  draft.value.splice(index, 1)
  save()
}

function setIncludeHidden(filter: FilterDraft, value: boolean) {
  filter.includeHidden = value
  save()
}
</script>

<template>
  <SettingsGroup
    id="filters"
    ref="root"
    title="Saved filters"
    :is-new="isNew('saved-filters')"
    description="Buttons in the review’s top bar. One click lists only their files."
  >
    <div v-for="(filter, index) in draft" :key="filter.key" :data-filter="filter.key" class="flex flex-col gap-2 rounded-md border p-2.5">
      <div class="flex items-center gap-2">
        <Input
          v-model="filter.name"
          :aria-label="`Name of filter ${index + 1}`"
          placeholder="Name, such as Backend"
          class="h-7 flex-1 font-medium"
          @input="schedule"
          @blur="flush"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          :aria-label="`Delete ${filter.name.trim() || `filter ${index + 1}`}`"
          title="Delete filter"
          @click="remove(index)"
        >
          <Trash2 />
        </Button>
      </div>
      <Textarea
        v-model="filter.patterns"
        :aria-label="`Paths for ${filter.name.trim() || `filter ${index + 1}`}`"
        rows="3"
        spellcheck="false"
        placeholder="src/**"
        class="min-h-16 font-mono text-xs md:text-xs"
        @input="schedule"
        @blur="flush"
      />
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <p class="text-xs text-muted-foreground">{{ problems[index] || matches(filter) }}</p>
        <div class="flex items-center gap-2">
          <Switch
            :id="`saved-filter-hidden-${filter.key}`"
            size="sm"
            :model-value="filter.includeHidden"
            @update:model-value="(value) => setIncludeHidden(filter, value)"
          />
          <FieldLabel :for="`saved-filter-hidden-${filter.key}`" class="text-xs font-normal">Include hidden files</FieldLabel>
        </div>
      </div>
    </div>
    <div class="flex flex-col items-start gap-2.5">
      <p v-if="!draft.length" class="text-xs text-muted-foreground">
        No saved filters yet. Start from an example, or press Save view in the review.
      </p>
      <Button variant="outline" size="sm" @click="add"><Plus /> Add filter</Button>
      <div v-if="examples.length" class="flex flex-wrap items-center gap-1">
        <span class="mr-1 text-xs text-muted-foreground">Examples:</span>
        <Button
          v-for="example in examples"
          :key="example.name"
          variant="ghost"
          size="xs"
          :title="example.include.join('  ')"
          :aria-label="`Add the ${example.name} example`"
          @click="addExample(example)"
        >
          <Plus /> {{ example.name }}
        </Button>
      </div>
    </div>
  </SettingsGroup>
</template>
