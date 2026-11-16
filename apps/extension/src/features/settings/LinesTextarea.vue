<script setup lang="ts">
import { Textarea } from '@/components/ui/textarea'
import { useDraft } from './useDraft'

const model = defineModel<string[]>({ required: true })

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

const { draft, schedule, flush } = useDraft({
  source: () => model.value,
  commit: (value) => (model.value = value),
  toDraft: (value) => value.join('\n'),
  fromDraft: splitLines,
})
</script>

<template>
  <Textarea v-model="draft" spellcheck="false" class="min-h-24 font-mono text-xs md:text-xs" @input="schedule" @blur="flush" />
</template>
