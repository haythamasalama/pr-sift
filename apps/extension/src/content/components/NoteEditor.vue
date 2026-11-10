<script setup lang="ts">
import { computed, onMounted, shallowRef, useTemplateRef } from 'vue'
import { ChevronDown, ChevronUp, ExternalLink } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { stepRange, type LineRange } from '@pr-sift/core'
import type { DiffRow, Note } from '../../lib/types'

const {
  quote = '',
  initial = '',
  rows,
  side,
  range,
} = defineProps<{ quote?: string; initial?: string; rows?: DiffRow[]; side?: Note['side']; range?: LineRange }>()
const emit = defineEmits<{ save: [text: string, range: LineRange | undefined]; cancel: []; openGithub: []; range: [range: LineRange] }>()

const text = shallowRef(initial)
const current = shallowRef<LineRange | undefined>(range)
const area = useTemplateRef<{ $el: HTMLTextAreaElement }>('area')
onMounted(() => area.value?.$el.focus())

const adjustable = computed(() => !!rows && !!side && !!current.value)
const label = computed(() => {
  const r = current.value
  if (!r) return ''
  return r.start === r.end ? `Line ${r.end}` : `Lines ${r.start}–${r.end}`
})

function move(edge: 'start' | 'end', dir: -1 | 1) {
  if (!rows || !side || !current.value) return
  current.value = stepRange(rows, side, current.value, edge, dir)
  emit('range', current.value)
}

function save() {
  if (text.value.trim()) emit('save', text.value.trim(), current.value)
}
</script>

<template>
  <div class="flex flex-col gap-2 border-y border-amber-500/50 bg-amber-500/10 px-3 py-2.5 font-sans">
    <div v-if="adjustable" class="flex flex-wrap items-center gap-1.5 text-xs">
      <span class="font-medium">{{ label }}</span>
      <span class="text-muted-foreground">start</span>
      <Button size="icon-xs" variant="outline" aria-label="Start one line earlier" title="Start one line earlier" @click="move('start', -1)"
        ><ChevronUp
      /></Button>
      <Button size="icon-xs" variant="outline" aria-label="Start one line later" title="Start one line later" @click="move('start', 1)"
        ><ChevronDown
      /></Button>
      <span class="text-muted-foreground">end</span>
      <Button size="icon-xs" variant="outline" aria-label="End one line earlier" title="End one line earlier" @click="move('end', -1)"
        ><ChevronUp
      /></Button>
      <Button size="icon-xs" variant="outline" aria-label="End one line later" title="End one line later" @click="move('end', 1)"
        ><ChevronDown
      /></Button>
    </div>
    <p v-if="quote" class="truncate border-l-2 border-amber-500 pl-2 font-mono text-[11px] text-muted-foreground" :title="quote">
      {{ quote }}
    </p>
    <Textarea
      ref="area"
      v-model="text"
      rows="3"
      placeholder="Private note — only you see it. Ctrl/⌘+Enter to save"
      class="min-h-16 bg-background text-xs md:text-xs"
      @keydown.enter.ctrl.prevent="save"
      @keydown.enter.meta.prevent="save"
      @keydown.esc.stop="emit('cancel')"
    />
    <div class="flex items-center gap-2">
      <Button size="sm" :disabled="!text.trim()" @click="save">Save note</Button>
      <Button size="sm" variant="outline" @click="emit('cancel')">Cancel</Button>
      <span class="flex-1" />
      <Button size="sm" variant="ghost" title="Open this line on GitHub" @click="emit('openGithub')">
        <ExternalLink /> Open on GitHub
      </Button>
    </div>
  </div>
</template>
