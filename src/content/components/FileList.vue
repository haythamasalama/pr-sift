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

async function scrollTo(filename: string) {
  const index = files.findIndex((f) => f.filename === filename)
  if (index < 0) return
  if (index >= limit.value) limit.value = index + 1
  await nextTick()
  const card = cards.value?.find((c) => c.el?.dataset.file === filename)
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
    @viewed="emit('setViewed', f, $event)"
  />
</template>
