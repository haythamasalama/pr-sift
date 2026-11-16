<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { whenIdle } from '../../lib/idle'
import type { PrFile } from '../../lib/types'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import FileCard from './FileCard.vue'

const { files } = defineProps<{ files: PrFile[]; viewed: Record<string, string> }>()
const emit = defineEmits<{ setViewed: [file: PrFile, value: boolean] }>()

const INITIAL_BATCH = 40
const BATCH = 60

const cards = useTemplateRef<InstanceType<typeof FileCard>[]>('cards')
const limit = shallowRef(INITIAL_BATCH)
const rendered = computed(() => files.slice(0, limit.value))
let cancelGrow: (() => void) | null = null

function grow() {
  cancelGrow?.()
  if (limit.value >= files.length) return
  cancelGrow = whenIdle(() => {
    limit.value += BATCH
    grow()
  }, 100)
}

onMounted(grow)
watch(() => files.length, grow)
onBeforeUnmount(() => cancelGrow?.())

const cardFor = (filename: string) => cards.value?.find((c) => c.el?.dataset.file === filename)

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node
  }
  return null
}

// Marking a file viewed collapses it, or removes it when viewed files are hidden. When the reader has scrolled past
// the top of that file, the content above the viewport shrinks and the next file would end up above the screen.
async function markViewed(file: PrFile, value: boolean) {
  const el = cardFor(file.filename)?.el
  const scroller = el ? scrollParent(el) : null
  const next = files[files.findIndex((f) => f.filename === file.filename) + 1]?.filename
  emit('setViewed', file, value)
  if (!value || !el || !scroller || el.getBoundingClientRect().top >= scroller.getBoundingClientRect().top) return
  await nextTick()
  const target = files.some((f) => f.filename === file.filename) ? file.filename : next
  const targetEl = target ? cardFor(target)?.el : null
  if (!targetEl) return
  const padding = parseFloat(getComputedStyle(scroller).paddingTop) || 0
  scroller.scrollTop += targetEl.getBoundingClientRect().top - scroller.getBoundingClientRect().top - padding
}

async function scrollTo(filename: string) {
  const index = files.findIndex((f) => f.filename === filename)
  if (index < 0) return
  if (index >= limit.value) limit.value = index + 1
  await nextTick()
  const card = cardFor(filename)
  if (!card) return
  card.reveal()
  await nextTick()
  card.el?.scrollIntoView({ block: 'start' })
  setTimeout(() => {
    card.el?.scrollIntoView({ block: 'start' })
    card.flash()
  }, 150)
}

function scrollToFolder(path: string) {
  const first = files.find((f) => f.filename.startsWith(path + '/'))
  if (first) return scrollTo(first.filename)
}

defineExpose({ scrollTo, scrollToFolder })
</script>

<template>
  <Empty v-if="!files.length" class="border-0">
    <EmptyHeader><EmptyTitle class="text-sm">No files match</EmptyTitle></EmptyHeader>
  </Empty>
  <FileCard
    v-for="f in rendered"
    :key="f.filename"
    ref="cards"
    :file="f"
    :viewed="viewed[f.filename] === f.hash"
    :stale="viewed[f.filename] !== undefined && viewed[f.filename] !== f.hash"
    @viewed="markViewed(f, $event)"
  />
</template>
