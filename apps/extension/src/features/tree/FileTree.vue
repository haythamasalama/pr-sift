<script setup lang="ts">
import { computed, provide, shallowRef, watch } from 'vue'
import { ChevronsDownUp, ChevronsUpDown, Layers } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { treeExpandKey, treeLayoutKey, treeOpenFileKey, type ExpandCommand } from './expandContext'
import { collectFiles, compactTree } from '@pr-sift/core'
import type { PrFile, TreeNode } from '../../lib/types'
import TreeFile from './TreeFile.vue'
import TreeNodeView from './TreeNode.vue'

const {
  tree,
  selected,
  isViewed,
  search = '',
  indent = 6,
  guides = true,
} = defineProps<{
  tree: TreeNode
  search?: string
  indent?: number
  guides?: boolean
  selected: string
  isViewed: (f: PrFile) => boolean
}>()

const emit = defineEmits<{
  selectFolder: [path: string]
  jumpFolder: [path: string]
  selectFile: [name: string]
  toggleViewed: [path: string, value: boolean]
  toggleFile: [file: PrFile, value: boolean]
  hideFolder: [path: string]
}>()

const expand = shallowRef<ExpandCommand>({ open: true, n: 0 })
provide(treeExpandKey, expand)
provide(
  treeLayoutKey,
  computed(() => ({ indent, guides })),
)
provide(treeOpenFileKey, shallowRef(''))
const setAll = (open: boolean) => (expand.value = { open, n: expand.value.n + 1 })

watch(
  () => search.trim(),
  (query) => {
    if (query) setAll(true)
  },
)

function showAll() {
  emit('selectFolder', '')
  emit('jumpFolder', '')
}

const compact = computed(() => compactTree(tree))
const viewedCount = computed(() => collectFiles(tree).filter(isViewed).length)
</script>

<template>
  <nav class="h-full overflow-auto px-2 pb-2 text-[13px]">
    <div
      class="group flex h-7 items-center gap-1 rounded-sm px-1.5 hover:bg-accent/60"
      :class="selected === '' ? 'bg-accent text-foreground' : 'text-foreground/90'"
    >
      <button type="button" class="flex min-w-0 flex-1 items-center gap-1.5 self-stretch text-left font-medium" @click="showAll">
        <Layers :size="14" class="shrink-0 text-muted-foreground" /> All folders
      </button>
      <span class="hidden shrink-0 items-center group-focus-within:flex group-hover:flex">
        <Button
          variant="ghost"
          size="icon-xs"
          class="size-[22px] text-muted-foreground hover:bg-transparent hover:text-foreground [&_svg]:size-[13px]"
          title="Expand all folders"
          aria-label="Expand all folders"
          @click="setAll(true)"
          ><ChevronsUpDown
        /></Button>
        <Button
          variant="ghost"
          size="icon-xs"
          class="size-[22px] text-muted-foreground hover:bg-transparent hover:text-foreground [&_svg]:size-[13px]"
          title="Collapse all folders"
          aria-label="Collapse all folders"
          @click="setAll(false)"
          ><ChevronsDownUp
        /></Button>
      </span>
      <span class="shrink-0 pr-0.5 text-[11px] text-muted-foreground tabular-nums" :title="`${viewedCount} of ${tree.count} files viewed`"
        >{{ viewedCount }}/{{ tree.count }}</span
      >
    </div>

    <TreeNodeView
      v-for="d in compact.dirs"
      :key="d.path"
      :node="d"
      :depth="0"
      :selected="selected"
      :is-viewed="isViewed"
      @jump-folder="emit('jumpFolder', $event)"
      @select-file="emit('selectFile', $event)"
      @toggle-viewed="(path, value) => emit('toggleViewed', path, value)"
      @toggle-file="(file, value) => emit('toggleFile', file, value)"
      @hide-folder="emit('hideFolder', $event)"
    />
    <TreeFile
      v-for="f in compact.files"
      :key="f.filename"
      :file="f"
      :viewed="isViewed(f)"
      @select="emit('selectFile', f.filename)"
      @toggle="(value) => emit('toggleFile', f, value)"
    />
  </nav>
</template>
